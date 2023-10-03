/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export function getCSPHeadersFromWebRequestResponse(
  response: chrome.webRequest.WebResponseHeadersDetails,
  reportHeader = false,
): Array<chrome.webRequest.HttpHeader> {
  return response.responseHeaders.filter(
    header =>
      header.name.toLowerCase() ===
      (reportHeader
        ? 'content-security-policy-report-only'
        : 'content-security-policy'),
  );
}
