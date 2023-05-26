/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  KNOWN_EXTENSION_HASHES,
  MESSAGE_TYPE,
  DOWNLOAD_JS_ENABLED,
  STATES,
  Origin,
} from './config';

import checkCSPHeaders from './content/checkCSPHeaders';
import downloadJSArchive from './content/downloadJSArchive';
import alertBackgroundOfImminentFetch from './content/alertBackgroundOfImminentFetch';
import {currentOrigin, updateCurrentState} from './content/updateCurrentState';
import checkElementForViolatingJSUri from './content/checkElementForViolatingJSUri';
import {checkElementForViolatingAttributes} from './content/checkElementForViolatingAttributes';
import isFbOrMsgrOrigin from './shared/isFbOrMsgrOrigin';
import {sendMessageToBackground} from './shared/sendMessageToBackground';
import genSourceText from './content/genSourceText';
import isPathnameExcluded from './content/isPathNameExcluded';
import {parseFailedJSON} from './content/parseFailedJSON';

const SOURCE_SCRIPTS = new Map<string, ReadableStream>();
const INLINE_SCRIPTS: Array<Map<string, string>> = [];
const FOUND_SCRIPTS: Array<ScriptDetails> = [];

type ScriptDetailsWithSrc = {
  otherType: string;
  src: string;
};
type ScriptDetailsRaw = {
  type: typeof MESSAGE_TYPE.RAW_JS;
  rawjs: string;
  lookupKey: string;
  otherType: string;
};
type ScriptDetails = ScriptDetailsRaw | ScriptDetailsWithSrc;

let currentFilterType = '';
let currentVersion = '';
let manifestTimeoutID: string | number = '';

export type RawManifestOtherHashes = {
  combined_hash: string;
  longtail: string;
  main: string;
};
type RawManifest = {
  manifest: Array<string>;
  manifest_hashes: RawManifestOtherHashes;
  leaves: Array<string>;
  root: string;
  version: string;
};

export function storeFoundJS(scriptNodeMaybe: HTMLScriptElement): void {
  if (window != window.top) {
    // this means that content utils is running in an iframe - disable timer and call processFoundJS on manifest processed in top level frame
    clearTimeout(manifestTimeoutID);
    manifestTimeoutID = '';
    window.setTimeout(() => processFoundJS(), 0);
  }
  // check if it's the manifest node
  if (
    window == window.top &&
    (scriptNodeMaybe.id === 'binary-transparency-manifest' ||
      scriptNodeMaybe.getAttribute('name') === 'binary-transparency-manifest')
  ) {
    if (scriptNodeMaybe.getAttribute('type') !== 'application/json') {
      updateCurrentState(STATES.INVALID, 'Manifest script type is invalid');
      return;
    }

    let rawManifest: RawManifest | null = null;
    try {
      rawManifest = JSON.parse(scriptNodeMaybe.textContent);
    } catch (manifestParseError) {
      setTimeout(
        () => parseFailedJSON({node: scriptNodeMaybe, retry: 5000}),
        20,
      );
      return;
    }

    let leaves = rawManifest.leaves;
    let otherHashes: RawManifestOtherHashes = null;
    let otherType = '';
    let roothash = rawManifest.root;
    currentVersion = rawManifest.version;

    if (isFbOrMsgrOrigin(currentOrigin.val)) {
      leaves = rawManifest.manifest;
      otherHashes = rawManifest.manifest_hashes;
      otherType = scriptNodeMaybe.getAttribute('data-manifest-type');
      roothash = otherHashes.combined_hash;
      currentVersion = scriptNodeMaybe.getAttribute('data-manifest-rev');

      if (currentFilterType === '') {
        currentFilterType = otherType;
      } else {
        currentFilterType = 'BOTH';
      }
    } else {
      // for whatsapp
      currentFilterType = 'BOTH';
    }

    sendMessageToBackground(
      {
        type: MESSAGE_TYPE.LOAD_MANIFEST,
        leaves: leaves,
        origin: currentOrigin.val,
        otherHashes: otherHashes,
        rootHash: roothash,
        workaround: scriptNodeMaybe.innerHTML,
        version: currentVersion,
      },
      response => {
        // then start processing of it's JS
        if (response.valid) {
          if (manifestTimeoutID !== '') {
            clearTimeout(manifestTimeoutID);
            manifestTimeoutID = '';
          }
          window.setTimeout(() => processFoundJS(), 0);
        } else {
          if (
            ['ENDPOINT_FAILURE', 'UNKNOWN_ENDPOINT_ISSUE'].includes(
              response.reason,
            )
          ) {
            updateCurrentState(STATES.TIMEOUT);
            return;
          }
          updateCurrentState(STATES.INVALID);
        }
      },
    );
  }

  if (scriptNodeMaybe.getAttribute('type') === 'application/json') {
    try {
      JSON.parse(scriptNodeMaybe.textContent);
    } catch (parseError) {
      setTimeout(
        () => parseFailedJSON({node: scriptNodeMaybe, retry: 1500}),
        20,
      );
    }
    return;
  }
  if (
    scriptNodeMaybe.src != null &&
    scriptNodeMaybe.src !== '' &&
    scriptNodeMaybe.src.indexOf('blob:') === 0
  ) {
    // TODO: try to process the blob. For now, flag as warning.
    updateCurrentState(STATES.INVALID);
    return;
  }

  const dataBtManifest = scriptNodeMaybe.getAttribute('data-btmanifest');
  const otherType = dataBtManifest == null ? '' : dataBtManifest.split('_')[1];
  // need to get the src of the JS
  if (scriptNodeMaybe.src != null && scriptNodeMaybe.src !== '') {
    FOUND_SCRIPTS.push({
      src: scriptNodeMaybe.src,
      otherType: otherType, // TODO: read from DOM when available
    });
  } else {
    // no src, access innerHTML for the code
    const hashLookupAttribute =
      scriptNodeMaybe.attributes['data-binary-transparency-hash-key'];
    const hashLookupKey = hashLookupAttribute && hashLookupAttribute.value;
    FOUND_SCRIPTS.push({
      type: MESSAGE_TYPE.RAW_JS,
      rawjs: scriptNodeMaybe.innerHTML,
      lookupKey: hashLookupKey,
      otherType: otherType, // TODO: read from DOM when available
    });
  }
  updateCurrentState(STATES.PROCESSING);
}

async function processJSWithSrc(script: ScriptDetailsWithSrc): Promise<{
  valid: boolean;
  type?: unknown;
}> {
  // fetch the script from page context, not the extension context.
  try {
    await alertBackgroundOfImminentFetch(script.src);
    const sourceResponse = await fetch(script.src, {
      method: 'GET',
    });
    if (DOWNLOAD_JS_ENABLED) {
      const fileNameArr = script.src.split('/');
      const fileName = fileNameArr[fileNameArr.length - 1].split('?')[0];
      SOURCE_SCRIPTS.set(
        fileName,
        sourceResponse
          .clone()
          .body.pipeThrough(new window.CompressionStream('gzip')),
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
            origin: currentOrigin.val,
            version: currentVersion,
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

export const processFoundJS = async (): Promise<void> => {
  const fullscripts = FOUND_SCRIPTS.splice(0);
  const scripts = fullscripts.filter(script => {
    if (
      script.otherType === currentFilterType ||
      ['BOTH', ''].includes(currentFilterType)
    ) {
      return true;
    } else {
      FOUND_SCRIPTS.push(script);
    }
  });
  let pendingScriptCount = scripts.length;
  for (const script of scripts) {
    if ('src' in script) {
      // ScriptDetailsWithSrc
      await processJSWithSrc(script).then(response => {
        pendingScriptCount--;
        if (response.valid) {
          if (pendingScriptCount == 0) {
            updateCurrentState(STATES.VALID);
          }
        } else {
          if (response.type === 'EXTENSION') {
            updateCurrentState(STATES.RISK);
          } else {
            updateCurrentState(STATES.INVALID);
          }
        }
        sendMessageToBackground({
          type: MESSAGE_TYPE.DEBUG,
          log:
            'processed JS with SRC, ' +
            script.src +
            ',response is ' +
            JSON.stringify(response).substring(0, 500),
        });
      });
    } else {
      // ScriptDetailsRaw
      sendMessageToBackground(
        {
          type: script.type,
          rawjs: script.rawjs.trimStart(),
          origin: currentOrigin.val,
          version: currentVersion,
        },
        response => {
          pendingScriptCount--;
          const inlineScriptMap = new Map();
          if (response.valid) {
            inlineScriptMap.set(response.hash, script.rawjs);
            INLINE_SCRIPTS.push(inlineScriptMap);
            if (pendingScriptCount == 0) {
              updateCurrentState(STATES.VALID);
            }
          } else {
            // using an array of maps, as we're using the same key for inline scripts - this will eventually be removed, once inline scripts are removed from the page load
            inlineScriptMap.set('hash not in manifest', script.rawjs);
            INLINE_SCRIPTS.push(inlineScriptMap);
            if (KNOWN_EXTENSION_HASHES.includes(response.hash)) {
              updateCurrentState(STATES.RISK);
            } else {
              updateCurrentState(STATES.INVALID);
            }
          }
          sendMessageToBackground({
            type: MESSAGE_TYPE.DEBUG,
            log:
              'processed the RAW_JS, response is ' +
              response.hash +
              ' ' +
              JSON.stringify(response).substring(0, 500),
          });
        },
      );
    }
  }
  window.setTimeout(() => processFoundJS(), 3000);
};

function checkNodeForViolations(element: Element): void {
  checkElementForViolatingJSUri(element);
  checkElementForViolatingAttributes(element);
}

export function hasInvalidScripts(scriptNodeMaybe: Node): void {
  // if not an HTMLElement ignore it!
  if (scriptNodeMaybe.nodeType !== 1) {
    return;
  }

  checkNodeForViolations(scriptNodeMaybe as Element);

  if (scriptNodeMaybe.nodeName.toLowerCase() === 'script') {
    storeFoundJS(scriptNodeMaybe as HTMLScriptElement);
  } else if (scriptNodeMaybe.childNodes.length > 0) {
    scriptNodeMaybe.childNodes.forEach(childNode => {
      hasInvalidScripts(childNode);
    });
  }
}
export const scanForScripts = (): void => {
  const allElements = document.getElementsByTagName('*');

  Array.from(allElements).forEach(element => {
    checkNodeForViolations(element);
    // next check for existing script elements and if they're violating
    if (element.nodeName.toLowerCase() === 'script') {
      storeFoundJS(element as HTMLScriptElement);
    }
  });

  try {
    // track any new scripts that get loaded in
    const scriptMutationObserver = new MutationObserver(mutationsList => {
      mutationsList.forEach(mutation => {
        if (mutation.type === 'childList') {
          Array.from(mutation.addedNodes).forEach(checkScript => {
            hasInvalidScripts(checkScript);
          });
        } else if (
          mutation.type === 'attributes' &&
          mutation.target.nodeType === 1
        ) {
          checkNodeForViolations(mutation.target as Element);
        }
      });
    });

    scriptMutationObserver.observe(document, {
      attributes: true,
      childList: true,
      subtree: true,
    });
  } catch (_UnknownError) {
    updateCurrentState(STATES.INVALID);
  }
};

export function startFor(
  origin: Origin,
  excludedPathnames: Array<RegExp> = [],
): void {
  sendMessageToBackground(
    {
      type: MESSAGE_TYPE.CONTENT_SCRIPT_START,
      origin,
    },
    resp => {
      if (isFbOrMsgrOrigin(currentOrigin.val)) {
        checkCSPHeaders(resp.cspHeader, resp.cspReportHeader);
      }
    },
  );
  if (isPathnameExcluded(excludedPathnames)) {
    updateCurrentState(STATES.IGNORE);
    return;
  }
  let isUserLoggedIn = false;
  if (isFbOrMsgrOrigin(origin)) {
    const cookies = document.cookie.split(';');
    cookies.forEach(cookie => {
      const pair = cookie.split('=');
      // c_user contains the user id of the user logged in
      if (pair[0].indexOf('c_user') >= 0) {
        isUserLoggedIn = true;
      }
    });
  } else {
    // only doing this check for FB and MSGR
    isUserLoggedIn = true;
  }
  if (isUserLoggedIn) {
    updateCurrentState(STATES.PROCESSING);
    currentOrigin.val = origin;
    scanForScripts();
    // set the timeout once, in case there's an iframe and contentUtils sets another manifest timer
    if (manifestTimeoutID === '') {
      manifestTimeoutID = window.setTimeout(() => {
        // Manifest failed to load, flag a warning to the user.
        updateCurrentState(STATES.TIMEOUT);
      }, 45000);
    }
  }
}

chrome.runtime.onMessage.addListener(function (request) {
  if (request.greeting === 'downloadSource' && DOWNLOAD_JS_ENABLED) {
    downloadJSArchive(SOURCE_SCRIPTS, INLINE_SCRIPTS);
  } else if (request.greeting === 'nocacheHeaderFound') {
    updateCurrentState(
      STATES.INVALID,
      `Detected uncached script ${request.uncachedUrl}`,
    );
  }
});

export function testOnly_getFoundScripts() {
  return FOUND_SCRIPTS;
}
