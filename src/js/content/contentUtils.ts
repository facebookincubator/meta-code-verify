/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import alertBackgroundOfImminentFetch from './alertBackgroundOfImminentFetch';

import {TagDetails} from '../content';
import {DOWNLOAD_JS_ENABLED, MESSAGE_TYPE} from '../config';
import genSourceText from './genSourceText';
import {sendMessageToBackground} from '../shared/sendMessageToBackground';
import {getCurrentOrigin} from './updateCurrentState';
import downloadJSArchive from './downloadJSArchive';

const SOURCE_SCRIPTS_AND_STYLES = new Map();

async function processSrc(
  tagDetails: TagDetails,
  version: string,
): Promise<{
  valid: boolean;
  type?: unknown;
}> {
  try {
    let packages: Array<string> = [];
    if (tagDetails.type === 'script' || tagDetails.type === 'link') {
      // fetch the script/style from page context, not the extension context.

      const url =
        tagDetails.type === 'script' ? tagDetails.src : tagDetails.href;
      const isServiceWorker =
        tagDetails.type === 'script' && tagDetails.isServiceWorker;

      await alertBackgroundOfImminentFetch(url);
      const sourceResponse = await fetch(url, {
        method: 'GET',
        // When the browser fetches a service worker it adds this header.
        // If this is missing it will cause a cache miss, resulting in invalidation.
        headers: isServiceWorker ? {'Service-Worker': 'script'} : undefined,
      });
      if (DOWNLOAD_JS_ENABLED) {
        const fileNameArr = url.split('/');
        const fileName = fileNameArr[fileNameArr.length - 1].split('?')[0];
        const responseBody = sourceResponse.clone().body;
        if (!responseBody) {
          throw new Error('Response for fetched script has no body');
        }
        SOURCE_SCRIPTS_AND_STYLES.set(
          fileName,
          responseBody.pipeThrough(new window.CompressionStream('gzip')),
        );
      }
      const sourceText = await genSourceText(sourceResponse);

      // split package up if necessary
      packages = sourceText.split('/*FB_PKG_DELIM*/\n');
    } else if (tagDetails.type === 'style') {
      packages = [tagDetails.tag.innerHTML];
    }

    const packagePromises = packages.map(pkg => {
      return new Promise((resolve, reject) => {
        sendMessageToBackground(
          {
            type: MESSAGE_TYPE.RAW_SRC,
            pkgRaw: pkg.trimStart(),
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

function downloadSrc(): void {
  downloadJSArchive(SOURCE_SCRIPTS_AND_STYLES);
}

export {processSrc, downloadSrc};
