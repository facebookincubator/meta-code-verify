/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {MessagePayload, MessageResponse} from './MessageTypes';

export async function sendMessageToBackground(
  message: MessagePayload,
): Promise<MessageResponse | null> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      message,
      (response: MessageResponse | null): void => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      },
    );
  });
}
