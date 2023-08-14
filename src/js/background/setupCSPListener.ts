/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CSPHeaderMap} from '../background';

export default function setupCSPListener(
  cspHeadersMap: CSPHeaderMap,
  cspReportHeadersMap: CSPHeaderMap,
): void {
  chrome.webRequest.onHeadersReceived.addListener(
    details => {
      if (details.responseHeaders) {
        const cspHeaders = details.responseHeaders.filter(
          header => header.name.toLowerCase() === 'content-security-policy',
        );
        const cspReportHeaders = details.responseHeaders.filter(
          header =>
            header.name.toLowerCase() === 'content-security-policy-report-only',
        );
        if (!cspHeadersMap.has(details.tabId)) {
          cspHeadersMap.set(details.tabId, new Map());
        }
        if (!cspReportHeadersMap.has(details.tabId)) {
          cspReportHeadersMap.set(details.tabId, new Map());
        }
        cspHeadersMap.get(details.tabId).set(
          details.frameId,
          cspHeaders.map(h => h.value),
        );
        cspReportHeadersMap.get(details.tabId).set(
          details.frameId,
          cspReportHeaders.map(h => h.value),
        );
      }
    },
    {
      types: ['main_frame', 'sub_frame'],
      urls: [
        '*://*.facebook.com/*',
        '*://*.messenger.com/*',
        '*://*.instagram.com/*',
      ],
    },
    ['responseHeaders'],
  );
}
