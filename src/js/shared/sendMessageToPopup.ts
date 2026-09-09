/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {State} from '../config';
import sendMessage, {
  MessagePayload as BaseMessagePayload,
  MessageResponse as BaseMessageResponse,
  MessageResponseExpectations,
  SendMessageResult,
} from './sendMessage';

export enum MESSAGE_TYPE {
  STATE_UPDATED = 'STATE_UPDATED',
}

export type MessageProtocol = {
  [MESSAGE_TYPE.STATE_UPDATED]: {
    request: {
      tabId: number;
      state: State;
    };
    response: never;
  };
};

export type Message = BaseMessagePayload<MessageProtocol>;

export type MessageResponse<Payload extends Message> = BaseMessageResponse<
  MessageProtocol,
  Payload
>;

const EXPECTS_RESPONSE = {
  [MESSAGE_TYPE.STATE_UPDATED]: false,
} as const satisfies MessageResponseExpectations<MessageProtocol>;

export default function sendMessageToPopup<Payload extends Message>(
  message: Payload,
): SendMessageResult<MessageProtocol, Payload> {
  return sendMessage<MessageProtocol>(
    message,
    EXPECTS_RESPONSE,
  ) as SendMessageResult<MessageProtocol, Payload>;
}
