/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const debugCache = new Map<number, Array<string>>();

function addDebugLog(tabId: number, debugMessage: string) {
  let tabDebugList = debugCache.get(tabId);
  if (tabDebugList == null) {
    tabDebugList = [];
    debugCache.set(tabId, tabDebugList);
  }

  tabDebugList.push(debugMessage);
}

function getDebugLog(tabId: number) {
  const tabDebugList = debugCache.get(tabId);
  return tabDebugList == null ? [] : tabDebugList;
}

function setupDebugLogListener(): void {
  chrome.tabs.onRemoved.addListener(tabId => {
    if (debugCache.has(tabId)) {
      debugCache.delete(tabId);
    }
  });
}

export {addDebugLog, getDebugLog, setupDebugLogListener};
