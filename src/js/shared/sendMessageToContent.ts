/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import sendMessage, {
  MessagePayload as BaseMessagePayload,
  MessageResponse as BaseMessageResponse,
  MessageResponseExpectations,
  SendMessageResult,
} from './sendMessage';

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
    response: never;
  };
  [MESSAGE_TYPE.DOWNLOAD_RELEASE_SOURCE]: {
    request: Record<never, never>;
    response: never;
  };
  [MESSAGE_TYPE.DOWNLOAD_SOURCE]: {
    request: Record<never, never>;
    response: never;
  };
  [MESSAGE_TYPE.NOCACHE_HEADER_FOUND]: {
    request: {uncachedUrl: string};
    response: never;
  };
  [MESSAGE_TYPE.SNIFFABLE_MIME_TYPE_RESOURCE]: {
    request: {src: string};
    response: never;
  };
};

export type Message = BaseMessagePayload<MessageProtocol>;

export type MessageResponse<Payload extends Message> = BaseMessageResponse<
  MessageProtocol,
  Payload
>;

const EXPECTS_RESPONSE = {
  [MESSAGE_TYPE.CHECK_IF_SCRIPT_WAS_PROCESSED]: false,
  [MESSAGE_TYPE.DOWNLOAD_RELEASE_SOURCE]: false,
  [MESSAGE_TYPE.DOWNLOAD_SOURCE]: false,
  [MESSAGE_TYPE.NOCACHE_HEADER_FOUND]: false,
  [MESSAGE_TYPE.SNIFFABLE_MIME_TYPE_RESOURCE]: false,
} as const satisfies MessageResponseExpectations<MessageProtocol>;

export default function sendMessageToContent<Payload extends Message>(
  tabId: number,
  message: Payload,
  options?: chrome.tabs.MessageSendOptions,
): SendMessageResult<MessageProtocol, Payload> {
  return sendMessage<MessageProtocol>(
    message,
    EXPECTS_RESPONSE,
    tabId,
    options,
  ) as SendMessageResult<MessageProtocol, Payload>;
}
