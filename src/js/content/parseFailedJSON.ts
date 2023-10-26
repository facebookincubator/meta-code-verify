/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import {STATES} from '../config';
import {updateCurrentState} from './updateCurrentState';

let failed_FOR_TEST_DO_NOT_USE: boolean | null = null;

export function clearFailedForTestDoNotUse(): void {
  failed_FOR_TEST_DO_NOT_USE = null;
}
export function getFailedForTestDoNotUse(): boolean | null {
  return failed_FOR_TEST_DO_NOT_USE;
}

export function parseFailedJSON(queuedJsonToParse: {
  node: Element;
  retry: number;
}): void {
  // Only a document/doctype can have textContent as null
  const nodeTextContent = queuedJsonToParse.node.textContent ?? '';
  try {
    JSON.parse(nodeTextContent);
  } catch (parseError) {
    if (queuedJsonToParse.retry > 0) {
      queuedJsonToParse.retry--;
      setTimeout(() => parseFailedJSON(queuedJsonToParse), 20);
    } else {
      updateCurrentState(STATES.INVALID);
      failed_FOR_TEST_DO_NOT_USE = true;
    }
  }
}
