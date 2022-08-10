/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import TabStateMachine from './TabStateMachine.js';

const tabStateTracker = new Map();

chrome.tabs.onRemoved.addListener((tabId, _removeInfo) => {
  tabStateTracker.delete(tabId);
});
chrome.tabs.onReplaced.addListener((_addedTabId, removedTabId) => {
  tabStateTracker.delete(removedTabId);
});

function getTabStateMachine(tabId) {
  if (!tabStateTracker.has(tabId)) {
    tabStateTracker.set(tabId, new TabStateMachine(tabId));
  }
  return tabStateTracker.get(tabId);
}

export function recordContentScriptStart(sender) {
  // This is a top-level frame initializing
  if (sender.frameId === 0) {
    tabStateTracker.delete(sender.tab.id);
  }
  getTabStateMachine(sender.tab.id).addFrameStateMachine(sender.frameId);
}

export function updateContentScriptState(sender, newState) {
  getTabStateMachine(sender.tab.id).updateStateForFrame(
    sender.frameId,
    newState
  );
}
