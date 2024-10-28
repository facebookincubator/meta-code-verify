/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export function hasVaryServiceWorkerHeader(
  response: chrome.webRequest.WebResponseCacheDetails,
): boolean {
  return (
    response.responseHeaders?.find(
      header =>
        header.name.includes('vary') &&
        header.value?.includes('Service-Worker'),
    ) !== undefined
  );
}
