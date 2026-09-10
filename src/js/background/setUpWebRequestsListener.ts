/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import sendMessageToContent, {
  MESSAGE_TYPE,
} from '../shared/sendMessageToContent';

const isMetaInitiatedResponse = (
  response: chrome.webRequest.OnResponseStartedDetails,
) => {
  const initiator = response.initiator;
  if (!initiator) {
    return false;
  }

  return [
    'https://www.facebook.com',
    'https://www.messenger.com',
    'https://www.instagram.com',
    'https://web.whatsapp.com',
  ].some(v => initiator.includes(v));
};

function checkResponseMIMEType(
  response: chrome.webRequest.OnResponseStartedDetails,
): void {
  // Sniffable MIME types are a violation
  if (
    response.responseHeaders?.find(header =>
      header.name.toLowerCase().includes('x-content-type-options'),
    )?.value !== 'nosniff'
  ) {
    sendMessageToContent(
      response.tabId,
      {
        type: MESSAGE_TYPE.SNIFFABLE_MIME_TYPE_RESOURCE,
        src: response.url,
      },
      {frameId: response.frameId},
    );
  }
}

export default function setUpWebRequestsListener(
  cachedScriptsUrls: Map<number, Set<string>>,
): void {
  chrome.webRequest.onResponseStarted.addListener(
    response => {
      if (response.tabId === -1) {
        if (
          response.url.startsWith('chrome-extension://') ||
          response.url.startsWith('moz-extension://')
        ) {
          return;
        }
        if (!isMetaInitiatedResponse(response)) {
          return;
        }
        checkResponseMIMEType(response);

        // Potential `importScripts` call from Shared or Service Worker
        if (response.type === 'script') {
          const origin = response.initiator;

          // Send to all tabs of this origin
          chrome.tabs.query({url: `${origin}/*`}, tabs => {
            tabs.forEach(tab => {
              if (tab.id) {
                sendMessageToContent(
                  tab.id,
                  {
                    type: MESSAGE_TYPE.CHECK_IF_SCRIPT_WAS_PROCESSED,
                    response,
                  },
                  // Send this to the topframe since child frames
                  // might have a different origin
                  {frameId: 0},
                );
              }
            });
          });
        }

        return;
      }

      // Detect uncached responses
      if (
        response.type === 'xmlhttprequest' &&
        cachedScriptsUrls.get(response.tabId)?.has(response.url)
      ) {
        if (!response.fromCache) {
          sendMessageToContent(
            response.tabId,
            {
              type: MESSAGE_TYPE.NOCACHE_HEADER_FOUND,
              uncachedUrl: response.url,
            },
            {frameId: response.frameId},
          );
        }
        cachedScriptsUrls.get(response.tabId)?.delete(response.url);
        return;
      }

      if (response.type === 'script') {
        checkResponseMIMEType(response);
        /*
         * Scripts could be from main thread or dedicates WebWorkers.
         * Content scripts can't detect scripts from Workers so we need
         * to send them back to content script for verification.
         * */
        sendMessageToContent(
          response.tabId,
          {
            type: MESSAGE_TYPE.CHECK_IF_SCRIPT_WAS_PROCESSED,
            response,
          },
          {frameId: response.frameId},
        );
        return;
      }
    },
    {urls: ['<all_urls>']},
    ['responseHeaders'],
  );
}
