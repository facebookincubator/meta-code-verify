/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {MessagePayload, MessageResponse} from './MessageTypes';

export function sendMessageToBackground(
  message: MessagePayload,
  callback?: (response: MessageResponse) => void,
): void {
  if (callback != null) {
    chrome.runtime.sendMessage(message, callback);
  } else {
    chrome.runtime.sendMessage(message);
  }
}
