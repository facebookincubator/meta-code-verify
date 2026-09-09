/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import sendMessageToBackground, {
  MESSAGE_TYPE,
} from '../shared/sendMessageToBackground';

export default async function alertBackgroundOfImminentFetch(
  url: string,
): Promise<void> {
  await sendMessageToBackground({
    type: MESSAGE_TYPE.UPDATED_CACHED_SCRIPT_URLS,
    url,
  });
}
