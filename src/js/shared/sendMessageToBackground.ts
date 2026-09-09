/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {MessagePayload, MessageResponse} from './MessageTypes';

export async function sendMessageToBackground<Payload extends MessagePayload>(
  message: Payload,
): Promise<MessageResponse<Payload>> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: unknown): void => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response as MessageResponse<Payload>);
      }
    });
  });
}
