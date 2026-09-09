/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {Origin, State} from '../config';
import type {RawManifestOtherHashes} from '../content';
import sendMessage, {
  MessagePayload as BaseMessagePayload,
  MessageResponse as BaseMessageResponse,
  MessageResponseExpectations,
  MessageWithResponder as BaseMessageWithResponder,
  SendMessageResult,
} from './sendMessage';

export enum MESSAGE_TYPE {
  DEBUG = 'DEBUG',
  LOAD_COMPANY_MANIFEST = 'LOAD_COMPANY_MANIFEST',
  RAW_SRC = 'RAW_SRC',
  UPDATE_STATE = 'UPDATE_STATE',
  CONTENT_SCRIPT_START = 'CONTENT_SCRIPT_START',
  UPDATED_CACHED_SCRIPT_URLS = 'UPDATED_CACHED_SCRIPT_URLS',
}

export type MessageProtocol = {
  [MESSAGE_TYPE.LOAD_COMPANY_MANIFEST]: {
    request: {
      origin: Origin;
      rootHash: string;
      otherHashes: RawManifestOtherHashes;
      leaves: Array<string>;
      version: string;
      workaround: string;
    };
    response: {valid: boolean; reason?: string};
  };
  [MESSAGE_TYPE.RAW_SRC]: {
    request: {
      pkgRaw: string;
      origin: Origin;
      version: string;
    };
    response: {valid: boolean; reason?: string; hash?: string};
  };
  [MESSAGE_TYPE.DEBUG]: {
    request: {
      log: string;
      src?: string;
    };
    response: never;
  };
  [MESSAGE_TYPE.UPDATE_STATE]: {
    request: {
      state: State;
      origin: Origin;
      details?: string;
    };
    response: {success: true};
  };
  [MESSAGE_TYPE.CONTENT_SCRIPT_START]: {
    request: {
      origin: Origin;
    };
    response: {
      success: true;
      cspHeaders?: Array<string>;
      cspReportHeaders?: Array<string>;
    };
  };
  [MESSAGE_TYPE.UPDATED_CACHED_SCRIPT_URLS]: {
    request: {
      url: string;
    };
    response: {success: true};
  };
};

export type Message = BaseMessagePayload<MessageProtocol>;

export type MessageResponse<Payload extends Message> = BaseMessageResponse<
  MessageProtocol,
  Payload
>;

export type MessageWithResponder = BaseMessageWithResponder<MessageProtocol>;

const EXPECTS_RESPONSE = {
  [MESSAGE_TYPE.DEBUG]: false,
  [MESSAGE_TYPE.LOAD_COMPANY_MANIFEST]: true,
  [MESSAGE_TYPE.RAW_SRC]: true,
  [MESSAGE_TYPE.UPDATE_STATE]: true,
  [MESSAGE_TYPE.CONTENT_SCRIPT_START]: true,
  [MESSAGE_TYPE.UPDATED_CACHED_SCRIPT_URLS]: true,
} as const satisfies MessageResponseExpectations<MessageProtocol>;

export default function sendMessageToBackground<Payload extends Message>(
  message: Payload,
): SendMessageResult<MessageProtocol, Payload> {
  return sendMessage<MessageProtocol>(
    message,
    EXPECTS_RESPONSE,
  ) as SendMessageResult<MessageProtocol, Payload>;
}
