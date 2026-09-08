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

export function parseFailedJSON(
  node: Element,
  retry: number,
  onSuccess?: () => void,
): void {
  // Only a document/doctype can have textContent as null
  const nodeTextContent = node.textContent ?? '';
  try {
    JSON.parse(nodeTextContent);
  } catch {
    if (retry > 0) {
      setTimeout(() => parseFailedJSON(node, retry - 1, onSuccess), 20);
    } else {
      updateCurrentState(STATES.INVALID);
      failed_FOR_TEST_DO_NOT_USE = true;
    }
    return;
  }
  onSuccess?.();
}
