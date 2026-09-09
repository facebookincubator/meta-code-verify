/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {
  MessagePayload as BaseMessagePayload,
  MessageResponse as BaseMessageResponse,
} from './MessageProtocol';

export enum MESSAGE_TYPE {
  CHECK_IF_SCRIPT_WAS_PROCESSED = 'checkIfScriptWasProcessed',
  DOWNLOAD_RELEASE_SOURCE = 'downloadReleaseSource',
  DOWNLOAD_SOURCE = 'downloadSource',
  NOCACHE_HEADER_FOUND = 'nocacheHeaderFound',
  SNIFFABLE_MIME_TYPE_RESOURCE = 'sniffableMimeTypeResource',
}

export type MessageProtocol = {
  [MESSAGE_TYPE.CHECK_IF_SCRIPT_WAS_PROCESSED]: {
    request: {response: chrome.webRequest.OnResponseStartedDetails};
    response: undefined;
  };
  [MESSAGE_TYPE.DOWNLOAD_RELEASE_SOURCE]: {
    request: Record<never, never>;
    response: undefined;
  };
  [MESSAGE_TYPE.DOWNLOAD_SOURCE]: {
    request: Record<never, never>;
    response: undefined;
  };
  [MESSAGE_TYPE.NOCACHE_HEADER_FOUND]: {
    request: {uncachedUrl: string};
    response: undefined;
  };
  [MESSAGE_TYPE.SNIFFABLE_MIME_TYPE_RESOURCE]: {
    request: {src: string};
    response: undefined;
  };
};

export type Message = BaseMessagePayload<MessageProtocol>;

export type MessageResponse<Payload extends Message> = BaseMessageResponse<
  MessageProtocol,
  Payload
>;

export default async function sendMessageToContent<Payload extends Message>(
  tabId: number,
  message: Payload,
  options?: chrome.tabs.MessageSendOptions,
): Promise<MessageResponse<Payload>> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(
      tabId,
      message,
      options,
      (response: unknown): void => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response as MessageResponse<Payload>);
        }
      },
    );
  });
}
