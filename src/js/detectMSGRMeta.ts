/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {ORIGIN_TYPE} from './config';
import {startFor} from './contentUtils.js';

startFor(ORIGIN_TYPE.MESSENGER, {
  checkLoggedInFromCookie: true,
  excludedPathnames: [],
});
