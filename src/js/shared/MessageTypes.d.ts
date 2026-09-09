/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {MESSAGE_TYPE, Origin, State} from '../config';
import {RawManifestOtherHashes} from '../content';

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
    response: undefined;
  };
  [MESSAGE_TYPE.STATE_UPDATED]: {
    request: {
      tabId: number;
      state: State;
    };
    response: undefined;
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

export type ProtocolMessageType = keyof MessageProtocol;

export type MessagePayload<
  Type extends ProtocolMessageType = ProtocolMessageType,
> = Type extends ProtocolMessageType
  ? {type: Type} & MessageProtocol[Type]['request']
  : never;

export type MessageResponse<Payload extends MessagePayload> =
  MessageProtocol[Payload['type']]['response'];

// Keeping the responder on the same discriminated union member as its request
// lets a check of `type` narrow both the payload and the allowed response.
export type MessageWithResponder = {
  [Type in ProtocolMessageType]: MessagePayload<Type> & {
    readonly sendResponse: (
      response: MessageProtocol[Type]['response'],
    ) => void;
  };
}[ProtocolMessageType];
