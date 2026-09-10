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

export type MessageResponseExpectations<Protocol> = {
  [Type in keyof Protocol]: Protocol[Type] extends {
    response: infer Response;
  }
    ? [Response] extends [never]
      ? false
      : true
    : never;
};

export type SendMessageResult<
  Protocol,
  Payload extends MessagePayload<Protocol>,
> =
  Payload extends MessagePayload<Protocol>
    ? [MessageResponse<Protocol, Payload>] extends [never]
      ? void
      : Promise<MessageResponse<Protocol, Payload>>
    : never;

// Keeping the responder on the same discriminated union member as its request
// lets a check of `type` narrow both the payload and the allowed response.
export type MessageWithResponder<Protocol> = {
  [Type in keyof Protocol]: MessagePayload<Protocol, Type> & {
    readonly sendResponse: Protocol[Type] extends {
      response: infer Response;
    }
      ? [Response] extends [never]
        ? never
        : (response: Response) => void
      : never;
  };
}[keyof Protocol];

function ignoreResponse(): void {
  // Accessing lastError prevents callback-based implementations from logging
  // expected delivery errors for fire-and-forget messages.
  void chrome.runtime.lastError;
}

function dispatchMessage<Payload>(
  message: Payload,
  responseCallback: (response: unknown) => void,
  tabId?: number,
  options?: chrome.tabs.MessageSendOptions,
): void {
  if (tabId == null) {
    chrome.runtime.sendMessage(message, responseCallback);
  } else {
    chrome.tabs.sendMessage(tabId, message, options, responseCallback);
  }
}

export default function sendMessage<Protocol>(
  message: MessagePayload<Protocol>,
  responseExpectations: MessageResponseExpectations<Protocol>,
  tabId?: number,
  options?: chrome.tabs.MessageSendOptions,
): void | Promise<unknown> {
  if (!responseExpectations[message.type]) {
    dispatchMessage(message, ignoreResponse, tabId, options);
    return;
  }

  return new Promise<unknown>((resolve, reject) => {
    dispatchMessage(
      message,
      (response: unknown): void => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      },
      tabId,
      options,
    );
  });
}
