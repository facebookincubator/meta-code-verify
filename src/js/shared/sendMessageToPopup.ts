/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {State} from '../config';
import type {
  MessagePayload as BaseMessagePayload,
  MessageResponse as BaseMessageResponse,
} from './MessageProtocol';

export enum MESSAGE_TYPE {
  STATE_UPDATED = 'STATE_UPDATED',
}

export type MessageProtocol = {
  [MESSAGE_TYPE.STATE_UPDATED]: {
    request: {
      tabId: number;
      state: State;
    };
    response: undefined;
  };
};

export type Message = BaseMessagePayload<MessageProtocol>;

export type MessageResponse<Payload extends Message> = BaseMessageResponse<
  MessageProtocol,
  Payload
>;

export default async function sendMessageToPopup<Payload extends Message>(
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
