/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import {STATES} from '../config';
import {updateCurrentState} from './updateCurrentState';

export function parseFailedJSON(queuedJsonToParse: {
  node: Element;
  retry: number;
}): void {
  try {
    JSON.parse(queuedJsonToParse.node.textContent);
  } catch (parseError) {
    if (queuedJsonToParse.retry > 0) {
      queuedJsonToParse.retry--;
      setTimeout(() => parseFailedJSON(queuedJsonToParse), 20);
    } else {
      updateCurrentState(STATES.INVALID, 'Failed to parse JSON');
    }
  }
}
