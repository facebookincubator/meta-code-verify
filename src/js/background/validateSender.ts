/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export type ValidSender = {
  frameId: number;
  tab: {id: number};
};

export function validateSender(
  sender: chrome.runtime.MessageSender,
): ValidSender | undefined {
  // The declaration for `sender.tab`:
  // The tabs.Tab which opened the connection, if any. This property will only
  // be present when the connection was opened from a tab (including content
  // scripts), and only if the receiver is an extension, not an app.
  //
  // We will always be receiving this message in an extension, and always from
  // a tab. Thus receiving a message without a tab indicates something wrong.
  const tab = sender.tab;
  if (!tab) {
    return;
  }

  // The declaration for `tab.id`:
  // The ID of the tab. Tab IDs are unique within a browser session. Under some
  // circumstances a Tab may not be assigned an ID, for example when querying
  // foreign tabs using the sessions API, in which case a session ID may be
  // present. Tab ID can also be set to chrome.tabs.TAB_ID_NONE for apps and
  // devtools windows.
  //
  // Since none of these apply we can assume that a missing ID indicates something
  // has gone wrong.
  const tabId = tab.id;
  if (tabId === undefined) {
    return;
  }

  // If a tab is present, a frameId should always be present.
  let frameId = sender.frameId;
  if (frameId === undefined) {
    return;
  }

  // See setupCSPListener.ts for explanation
  if (sender?.documentLifecycle === 'prerender') {
    frameId = 0;
  }

  return {
    frameId,
    tab: {id: tabId},
  };
}
