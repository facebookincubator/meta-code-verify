/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export function hasVaryServiceWorkerHeader(
  response: chrome.webRequest.OnResponseStartedDetails,
): boolean {
  return (
    response.responseHeaders?.find(
      header =>
        // HTTP header names are case-insensitive, and the field names listed
        // in a Vary value are too, so normalize before matching.
        header.name.toLowerCase().includes('vary') &&
        header.value?.toLowerCase().includes('service-worker'),
    ) !== undefined
  );
}
