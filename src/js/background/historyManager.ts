/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {Origin} from '../config';

const HISTORY_TTL_MSEC = 120 * 86400 * 1000; // 120 Days

const TAB_TO_VIOLATING_SRCS = new Map<
  number,
  Set<{
    origin: Origin;
    version: string;
    hash: string;
  }>
>();

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
  const keys = await chrome.storage.local.getKeys();
  const entries = await chrome.storage.local.get(keys);

  const entriesToDelete = Object.entries(entries)
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
