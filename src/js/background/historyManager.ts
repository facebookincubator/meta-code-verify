/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {Origin} from '../config';

const HISTORY_TTL_MSEC = 120 * 86400 * 1000; // 120 Days

type Violation = {
  origin: Origin;
  version: string;
  hash: string;
};

const TAB_TO_VIOLATING_SRCS = new Map<number, Set<Violation>>();

export async function getRecords(): Promise<
  Array<
    [string, {creationTime: number; violations: Array<Violation>; url: string}]
  >
> {
  return Object.entries(await chrome.storage.local.get(null));
}

export async function downloadHashSource(
  tabID: string,
  hash: string,
): Promise<void> {
  const opfsRoot = await navigator.storage.getDirectory();
  const dir = await opfsRoot.getDirectoryHandle(tabID);
  const fileHandle = await dir.getFileHandle(hash);
  const file = await fileHandle.getFile();

  const decompressedStream = file
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));

  const src = await new Response(decompressedStream).text();

  const url = URL.createObjectURL(new Blob([src], {type: 'text/plain'}));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tabID}-${hash}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function upsertInvalidRecord(
  tabID: number,
  creationTime: number,
): Promise<void> {
  const tab = await chrome.tabs.get(tabID);
  const tabIDKey = String(tabID);
  const entry = await chrome.storage.local.get(tabIDKey);

  if (Object.keys(entry).length !== 0) {
    creationTime = entry[tabIDKey].creationTime;
  }

  return chrome.storage.local.set({
    [tabIDKey]: {
      creationTime,
      violations: Array.from(TAB_TO_VIOLATING_SRCS.get(tabID) ?? new Set()),
      url: tab.url,
    },
  });
}

export async function trackViolationForTab(
  tabId: number,
  rawSource: string,
  origin: Origin,
  version: string,
  hash: string,
) {
  if (!TAB_TO_VIOLATING_SRCS.has(tabId)) {
    TAB_TO_VIOLATING_SRCS.set(tabId, new Set());
  }
  TAB_TO_VIOLATING_SRCS.get(tabId)?.add({
    origin,
    version,
    hash,
  });

  const opfsRoot = await navigator.storage.getDirectory();
  // Make a directory for this tabId
  const dir = await opfsRoot.getDirectoryHandle(String(tabId), {create: true});
  // Create one file per violating src keyed by the hash, gzip the contents
  const file = await dir.getFileHandle(hash, {create: true});
  const writable = await file.createWritable();
  const encoder = new TextEncoder();
  const uint8 = encoder.encode(rawSource);
  const stream = new Blob([uint8]).stream();
  const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));

  await compressedStream.pipeTo(writable);
}

export async function setUpHistoryCleaner(): Promise<void> {
  const now = Date.now();

  const entriesToDelete = (await getRecords())
    .filter(([_keys, entry]) => now - entry.creationTime >= HISTORY_TTL_MSEC)
    .map(entry => entry[0]);

  if (entriesToDelete.length > 0) {
    const opfsRoot = await navigator.storage.getDirectory();
    await chrome.storage.local.remove(entriesToDelete);
    console.log('Removing entries from extension storage', entriesToDelete);
    entriesToDelete.forEach(async key => {
      await opfsRoot.removeEntry(key, {recursive: true}).then(() => {
        console.log(`Removed hashes for entry ${key}`);
      });
    });
  }
}
