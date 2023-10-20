/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {CSPHeaderMap} from '../background';
import {getCSPHeadersFromWebRequestResponse} from '../shared/getCSPHeadersFromWebRequestResponse';
import {setOrUpdateMapInMap} from '../shared/nestedDataHelpers';

export default function setupCSPListener(
  cspHeadersMap: CSPHeaderMap,
  cspReportHeadersMap: CSPHeaderMap,
): void {
  chrome.webRequest.onHeadersReceived.addListener(
    details => {
      if (details.responseHeaders) {
        const cspHeaders = getCSPHeadersFromWebRequestResponse(details);
        const cspReportHeaders = getCSPHeadersFromWebRequestResponse(
          details,
          true,
        );
        let frameId = details.frameId;
        if (
          // @ts-expect-error Missing: type definitions in @types/chrome
          details?.documentLifecycle === 'prerender' &&
          // @ts-expect-error Missing: type definitions in @types/chrome
          details?.frameType === 'outermost_frame' &&
          details.type === 'main_frame' &&
          details.frameId !== 0
        ) {
          /**
           * This seems to be unintended behavior in `webRequest` where
           * frameId ends up as non-zero for prerendered documents.
           * Tracking in https://bugs.chromium.org/p/chromium/issues/detail?id=1492006
           */
          frameId = 0;
        }
        setOrUpdateMapInMap(
          cspHeadersMap,
          details.tabId,
          frameId,
          cspHeaders.map(h => h.value),
        );
        setOrUpdateMapInMap(
          cspReportHeadersMap,
          details.tabId,
          frameId,
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
