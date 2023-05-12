/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export default function setupNoCacheListeners(
  cachedScriptsUrls: Map<number, Set<string>>,
): void {
  chrome.webRequest.onResponseStarted.addListener(
    response => {
      if (
        response.tabId !== -1 &&
        !response.fromCache &&
        cachedScriptsUrls.get(response.tabId)?.has(response.url)
      ) {
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {
            greeting: 'nocacheHeaderFound',
            uncachedUrl: response.url,
          });
        });
      }
      cachedScriptsUrls.get(response.tabId)?.delete(response.url);
    },
    {urls: ['<all_urls>'], types: ['xmlhttprequest']},
    ['responseHeaders'],
  );
}
