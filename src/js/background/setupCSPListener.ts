/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export function setupCSPListener(
  cspHeaders: Map<number, string | undefined>,
  cspReportHeaders: Map<number, string | undefined>
): void {
  chrome.webRequest.onHeadersReceived.addListener(
    details => {
      if (details.frameId === 0 && details.responseHeaders) {
        const cspHeader = details.responseHeaders.find(
          header => header.name === 'content-security-policy'
        );
        const cspReportHeader = details.responseHeaders.find(
          header => header.name === 'content-security-policy-report-only'
        );
        cspHeaders.set(details.tabId, cspHeader?.value);
        cspReportHeaders.set(details.tabId, cspReportHeader?.value);
      }
    },
    {
      types: ['main_frame'],
      urls: ['*://*.facebook.com/*', '*://*.messenger.com/*'],
    },
    ['responseHeaders']
  );
}
