/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Origin, State } from '../config';
import TabStateMachine from './TabStateMachine';

const tabStateTracker = new Map<number, TabStateMachine>();

chrome.tabs.onRemoved.addListener((tabId: number, _removeInfo) => {
  tabStateTracker.delete(tabId);
});
chrome.tabs.onReplaced.addListener((_addedTabId, removedTabId: number) => {
  tabStateTracker.delete(removedTabId);
});

function getOrCreateTabStateMachine(tabId: number, origin: Origin) {
  if (!tabStateTracker.has(tabId)) {
    tabStateTracker.set(tabId, new TabStateMachine(tabId, origin));
  }
  return tabStateTracker.get(tabId);
}

export function recordContentScriptStart(
  sender: chrome.runtime.MessageSender,
  origin: Origin
) {
  // This is a top-level frame initializing
  if (sender.frameId === 0) {
    tabStateTracker.delete(sender.tab.id);
  }
  getOrCreateTabStateMachine(sender.tab.id, origin).addFrameStateMachine(
    sender.frameId
  );
}

export function updateContentScriptState(
  sender: chrome.runtime.MessageSender,
  newState: State,
  origin: Origin
) {
  getOrCreateTabStateMachine(sender.tab.id, origin).updateStateForFrame(
    sender.frameId,
    newState
  );
}
