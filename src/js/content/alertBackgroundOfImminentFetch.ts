/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {MESSAGE_TYPE} from '../config';
import {sendMessageToBackground} from '../shared/sendMessageToBackground';

export default function alertBackgroundOfImminentFetch(
  url: string,
): Promise<void> {
  return new Promise(resolve => {
    sendMessageToBackground(
      {
        type: MESSAGE_TYPE.UPDATED_CACHED_SCRIPT_URLS,
        url,
      },
      () => {
        resolve();
      },
    );
  });
}
