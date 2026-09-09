/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import alertBackgroundOfImminentFetch from './alertBackgroundOfImminentFetch';

import {TagDetails} from '../content';
import {MESSAGE_TYPE} from '../config';
import {sendMessageToBackground} from '../shared/sendMessageToBackground';
import {getCurrentOrigin} from './updateCurrentState';

const SOURCE_SCRIPTS_AND_STYLES = new Map<string, Response>();

/**
 * Return text from the response object. The main purpose of this method is to
 * extract and parse sourceURL and sourceMappingURL comments from inlined data
 * scripts.
 * Note that this function consumes the response body!
 *
 * @param {Response} response Response will be consumed!
 * @returns string Response text if the sourceURL is valid
 */
async function genSourceText(response: Response): Promise<string> {
  const sourceText = await response.text();
  // Just a normal script tag with a source url
  if (!response.url.startsWith('data:application/x-javascript')) {
    return sourceText;
  }

  // Inlined data-script. We need to extract with optional `//# sourceURL=` and
  // `//# sourceMappingURL=` comments before sending it over to be hashed...
  const sourceTextParts = sourceText.trimEnd().split('\n');

  // NOTE: For security reasons, we expect inlined data scripts to *end* with
  // sourceURL comments. This is because a man-in-the-middle can insert code
  // after the sourceURL comment, which would execute on the browser but get
  // stripped away by the extension before getting hashed + verified.
  // As a result, we're always starting our search from the bottom.
  while (isValidSourceURL(sourceTextParts[sourceTextParts.length - 1])) {
    sourceTextParts.pop();
  }
  return sourceTextParts.join('\n').trim();
}

const isValidSourceURL = (sourceURL: string): boolean => {
  return /^\/\/#\s*source(Mapping)?URL=https?:\/\/[^\s]+.js(\.map)?(?!\s)$/u.test(
    sourceURL,
  );
};

export async function processSrc(
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
      const fileNameArr = url.split('/');
      const fileName = fileNameArr[fileNameArr.length - 1].split('?')[0];
      const responseBody = sourceResponse.clone();
      if (!responseBody.body) {
        throw new Error('Response for fetched script has no body');
      }
      SOURCE_SCRIPTS_AND_STYLES.set(fileName, responseBody);
      const sourceText = await genSourceText(sourceResponse);

      // split package up if necessary
      packages = sourceText.split('/*FB_PKG_DELIM*/\n');
    } else if (
      tagDetails.type === 'style' ||
      tagDetails.type === 'inline_script'
    ) {
      packages = [tagDetails.tag.innerHTML];
    }

    await Promise.all(
      packages.map(async pkg => {
        const response = await sendMessageToBackground({
          type: MESSAGE_TYPE.RAW_SRC,
          pkgRaw: pkg.trimStart(),
          origin: getCurrentOrigin(),
          version: version,
        });
        if (!response.valid) {
          throw new Error(
            response.reason ?? 'Invalid response from RAW_SRC message',
          );
        }
      }),
    );
    return {valid: true};
  } catch (scriptProcessingError) {
    return {
      valid: false,
      type: scriptProcessingError,
    };
  }
}

export async function downloadSrc(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chunks: Array<any> = [];
  const enc = new TextEncoder();
  const compressionStream = new CompressionStream('gzip');

  for (const [fileName, response] of SOURCE_SCRIPTS_AND_STYLES.entries()) {
    const delim = `\n********** new file: ${fileName} **********\n`;
    const chunk = await response.bytes();
    chunks.push(enc.encode(delim), chunk);
  }

  const readableFromChunks = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });

  if ('showSaveFilePicker' in window) {
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: 'meta_source_files.gz',
    });
    const fileStream = await fileHandle.createWritable();
    readableFromChunks.pipeThrough(compressionStream).pipeTo(fileStream);
  } else {
    const src = await new Response(
      readableFromChunks.pipeThrough(compressionStream),
    ).blob();
    const url = URL.createObjectURL(src);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meta_source_files.gz`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
