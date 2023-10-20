/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {MESSAGE_TYPE, Origin, State, STATES} from '../config';
import {sendMessageToBackground} from '../shared/sendMessageToBackground';

let currentOrigin: Origin | undefined;

export function setCurrentOrigin(origin: Origin): void {
  currentOrigin = origin;
}

export function getCurrentOrigin(): Origin {
  if (!currentOrigin) {
    invalidateAndThrow(
      'Attemting to access currentOrigin before it has been set',
    );
  }

  return currentOrigin;
}

export function updateCurrentState(state: State, details?: string) {
  sendMessageToBackground({
    type: MESSAGE_TYPE.UPDATE_STATE,
    state,
    origin: getCurrentOrigin(),
    details,
  });
}

export function invalidateAndThrow(details?: string): never {
  updateCurrentState(STATES.INVALID, details);
  throw new Error(details);
}
