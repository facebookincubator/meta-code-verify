/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import {STATES} from '../config';
import {updateCurrentState} from './updateCurrentState';

export default function parseFailedJson(queuedJsonToParse: {
  text: string;
  retry: number;
}): void {
  try {
    JSON.parse(queuedJsonToParse.text);
  } catch (parseError) {
    if (queuedJsonToParse.retry > 0) {
      queuedJsonToParse.retry--;
      setTimeout(() => parseFailedJson(queuedJsonToParse), 20);
    } else {
      updateCurrentState(STATES.INVALID);
    }
  }
}
