/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export function getCSPHeadersFromWebRequestResponse(
  response: chrome.webRequest.OnHeadersReceivedDetails,
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

  // A single header value can be a comma separated list of policies. The
  // separator is a bare comma; the surrounding whitespace is optional.
  // https://www.w3.org/TR/CSP3/#parse-serialized-policy-list
  const individualHeaders: Array<chrome.webRequest.HttpHeader> = [];
  cspHeaders.forEach(header => {
    if (header.value == null) {
      individualHeaders.push(header);
      return;
    }
    header.value.split(',').forEach(headerValue => {
      const trimmed = headerValue.trim();
      if (trimmed !== '') {
        individualHeaders.push({name: header.name, value: trimmed});
      }
    });
  });
  return individualHeaders;
}
