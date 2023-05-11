/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {ORIGIN_TYPE} from '../config';

export default function isFbMsgrOrIgOrigin(origin: string): boolean {
  return [
    ORIGIN_TYPE.FACEBOOK,
    ORIGIN_TYPE.MESSENGER,
    ORIGIN_TYPE.INSTAGRAM,
  ].some(e => e === origin);
}
