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
           * Chrome uses a non-main frame for prerender
           * https://bugs.chromium.org/p/chromium/issues/detail?id=1492006
           *
           * This creates issues in tracking the document resources
           * because content scripts *might* start sending messages
           * to the background while the document is still in "prerender"-ing
           * mode. When that happens the "sender" correctly has the frameID;
           * however, at other times (if the user hits navigate/enter? quick enough)
           * content script ends up sending messages from the "main" frame
           * (frameId = 0). To handle the former case whenever the background
           * receives a messages from a frame that is still in "prerendering"
           * we assume the frameID to 0. See validateSender.ts
           */
          frameId = 0;
        }
        if (details.tabId !== 0) {
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
        } else {
          // Safari, https://developer.apple.com/forums/thread/668159
          // Best guess effort, this should be fast enough that we can
          // get the correct tabID even if the user is opening multiple tabs
          chrome.tabs.query({active: true, currentWindow: true}).then(tabs => {
            if (tabs.length !== 0) {
              setOrUpdateMapInMap(
                cspHeadersMap,
                tabs[0].id,
                frameId,
                cspHeaders.map(h => h.value),
              );
              setOrUpdateMapInMap(
                cspReportHeadersMap,
                tabs[0].id,
                frameId,
                cspReportHeaders.map(h => h.value),
              );
            }
          });
        }
      }
    },
    {
      types: ['main_frame', 'sub_frame'],
      urls: [
        '*://*.facebook.com/*',
        '*://*.messenger.com/*',
        '*://*.instagram.com/*',
        '*://*.whatsapp.com/*',
      ],
    },
    ['responseHeaders'],
  );
}
