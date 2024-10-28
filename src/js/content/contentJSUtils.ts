/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import alertBackgroundOfImminentFetch from './alertBackgroundOfImminentFetch';

import {ScriptDetails} from '../content';
import {DOWNLOAD_JS_ENABLED, MESSAGE_TYPE} from '../config';
import genSourceText from './genSourceText';
import {sendMessageToBackground} from '../shared/sendMessageToBackground';
import {getCurrentOrigin} from './updateCurrentState';
import downloadJSArchive from './downloadJSArchive';

const SOURCE_SCRIPTS = new Map();

async function processJSWithSrc(
  script: ScriptDetails,
  version: string,
): Promise<{
  valid: boolean;
  type?: unknown;
}> {
  // fetch the script from page context, not the extension context.
  try {
    await alertBackgroundOfImminentFetch(script.src);
    const sourceResponse = await fetch(script.src, {
      method: 'GET',
      // When the browser fetches a service worker it adds this header.
      // If this is missing it will cause a cache miss, resulting in invalidation.
      headers: script.isServiceWorker
        ? {'Service-Worker': 'script'}
        : undefined,
    });
    if (DOWNLOAD_JS_ENABLED) {
      const fileNameArr = script.src.split('/');
      const fileName = fileNameArr[fileNameArr.length - 1].split('?')[0];
      const responseBody = sourceResponse.clone().body;
      if (!responseBody) {
        throw new Error('Response for fetched script has no body');
      }
      SOURCE_SCRIPTS.set(
        fileName,
        responseBody.pipeThrough(new window.CompressionStream('gzip')),
      );
    }
    const sourceText = await genSourceText(sourceResponse);
    // split package up if necessary
    const packages = sourceText.split('/*FB_PKG_DELIM*/\n');
    const packagePromises = packages.map(jsPackage => {
      return new Promise((resolve, reject) => {
        sendMessageToBackground(
          {
            type: MESSAGE_TYPE.RAW_JS,
            rawjs: jsPackage.trimStart(),
            origin: getCurrentOrigin(),
            version: version,
          },
          response => {
            if (response.valid) {
              resolve(null);
            } else {
              reject();
            }
          },
        );
      });
    });
    await Promise.all(packagePromises);
    return {valid: true};
  } catch (scriptProcessingError) {
    return {
      valid: false,
      type: scriptProcessingError,
    };
  }
}

function downloadJS(): void {
  downloadJSArchive(SOURCE_SCRIPTS);
}

export {processJSWithSrc, downloadJS};
