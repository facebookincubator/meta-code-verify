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
  const responseHeaders = response.responseHeaders;
  if (!responseHeaders) {
    throw new Error('Request is missing responseHeaders');
  }
  const cspHeaders = responseHeaders.filter(
    header =>
      header.name.toLowerCase() ===
      (reportHeader
        ? 'content-security-policy-report-only'
        : 'content-security-policy'),
  );

  // A single header value can be a comma seperated list of headers
  // https://www.w3.org/TR/CSP3/#parse-serialized-policy-list
  const individualHeadears: Array<chrome.webRequest.HttpHeader> = [];
  cspHeaders.forEach(header => {
    if (header.value?.includes(', ')) {
      header.value.split(', ').forEach(headerValue => {
        individualHeadears.push({name: header.name, value: headerValue});
      });
    } else {
      individualHeadears.push(header);
    }
  });
  return individualHeadears;
}
