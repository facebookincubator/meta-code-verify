/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export type MessagePayload<
  Protocol,
  Type extends keyof Protocol = keyof Protocol,
> = Type extends keyof Protocol
  ? Protocol[Type] extends {request: infer Request extends object}
    ? {type: Type} & Request
    : never
  : never;

export type MessageResponse<
  Protocol,
  Payload extends MessagePayload<Protocol>,
> = Protocol[Payload['type']] extends {response: infer Response}
  ? Response
  : never;

// Keeping the responder on the same discriminated union member as its request
// lets a check of `type` narrow both the payload and the allowed response.
export type MessageWithResponder<Protocol> = {
  [Type in keyof Protocol]: MessagePayload<Protocol, Type> & {
    readonly sendResponse: (
      response: Protocol[Type] extends {response: infer Response}
        ? Response
        : never,
    ) => void;
  };
}[keyof Protocol];
