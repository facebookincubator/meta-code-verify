/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CSPHeaderMap} from '../background';

export default function setupCSPListener(
  cspHeaders: CSPHeaderMap,
  cspReportHeaders: CSPHeaderMap,
): void {
  chrome.webRequest.onHeadersReceived.addListener(
    details => {
      if (details.responseHeaders) {
        const cspHeader = details.responseHeaders.find(
          header => header.name === 'content-security-policy',
        );
        const cspReportHeader = details.responseHeaders.find(
          header => header.name === 'content-security-policy-report-only',
        );
        if (!cspHeaders.has(details.tabId)) {
          cspHeaders.set(details.tabId, new Map());
        }
        if (!cspReportHeaders.has(details.tabId)) {
          cspReportHeaders.set(details.tabId, new Map());
        }
        cspHeaders.get(details.tabId).set(details.frameId, cspHeader?.value);
        cspReportHeaders
          .get(details.tabId)
          .set(details.frameId, cspReportHeader?.value);
      }
    },
    {
      types: ['main_frame', 'sub_frame'],
      urls: ['*://*.facebook.com/*', '*://*.messenger.com/*'],
    },
    ['responseHeaders'],
  );
}
