/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  KNOWN_EXTENSION_HASHES,
  MESSAGE_TYPE,
  ORIGIN_TYPE,
  DOWNLOAD_JS_ENABLED,
  STATES,
  Origin,
} from './config';

import checkCSPHeaders from './content/checkCSPHeaders';
import downloadJSArchive from './content/downloadJSArchive';
import alertBackgroundOfImminentFetch from './content/alertBackgroundOfImminentFetch';
import {currentOrigin, updateCurrentState} from './content/updateCurrentState';
import checkElementForViolatingJSURI from './content/checkElementForViolatingJSURI';
import {checkElementForViolatingAttributes} from './content/checkElementForViolatingAttributes';
import isFbOrMsgrOrigin from './shared/isFbOrMsgrOrigin';
import {MessagePayload} from './shared/MessagePayload';

const SOURCE_SCRIPTS = new Map();
const INLINE_SCRIPTS = [];
export const FOUND_SCRIPTS = new Map([['', []]]);

let currentFilterType = '';
let manifestTimeoutID: string | number = '';

export function storeFoundJS(scriptNodeMaybe) {
  if (window != window.top) {
    // this means that content utils is running in an iframe - disable timer and call processFoundJS on manifest processed in top level frame
    clearTimeout(manifestTimeoutID);
    manifestTimeoutID = '';
    window.setTimeout(
      () =>
        processFoundJS(currentOrigin.val, FOUND_SCRIPTS.keys().next().value),
      0,
    );
  }
  // check if it's the manifest node
  if (
    window == window.top &&
    (scriptNodeMaybe.id === 'binary-transparency-manifest' ||
      scriptNodeMaybe.getAttribute('name') === 'binary-transparency-manifest')
  ) {
    if (scriptNodeMaybe.getAttribute('type') !== 'application/json') {
      sendMessage({
        type: MESSAGE_TYPE.DEBUG,
        log: 'Manifest script type is invalid',
      });
      updateCurrentState(STATES.INVALID);
      return;
    }

    let rawManifest: string | any = '';
    try {
      rawManifest = JSON.parse(scriptNodeMaybe.textContent);
    } catch (manifestParseError) {
      setTimeout(
        () => parseFailedJson({node: scriptNodeMaybe, retry: 5000}),
        20,
      );
      return;
    }

    let leaves = rawManifest.leaves;
    let otherHashes: any = '';
    let otherType = '';
    let roothash = rawManifest.root;
    let version = rawManifest.version;

    if (isFbOrMsgrOrigin(currentOrigin.val)) {
      leaves = rawManifest.manifest;
      otherHashes = rawManifest.manifest_hashes;
      otherType = scriptNodeMaybe.getAttribute('data-manifest-type');
      roothash = otherHashes.combined_hash;
      version = scriptNodeMaybe.getAttribute('data-manifest-rev');

      if (currentFilterType != '') {
        currentFilterType = 'BOTH';
      }
      if (currentFilterType === '') {
        currentFilterType = otherType;
      }
    }
    // for whatsapp
    else {
      currentFilterType = 'BOTH';
    }
    // now that we know the actual version of the scripts, transfer the ones we know about.
    if (FOUND_SCRIPTS.has('')) {
      FOUND_SCRIPTS.set(version, FOUND_SCRIPTS.get(''));
      FOUND_SCRIPTS.delete('');
    }

    sendMessage(
      {
        type: MESSAGE_TYPE.LOAD_MANIFEST,
        leaves: leaves,
        origin: currentOrigin.val as Origin,
        otherHashes: otherHashes,
        rootHash: roothash,
        workaround: scriptNodeMaybe.innerHTML,
        version: version,
      },
      response => {
        sendMessage({
          type: MESSAGE_TYPE.DEBUG,
          log:
            'manifest load response is ' + response
              ? JSON.stringify(response).substring(0, 500)
              : '',
        });
        // then start processing of it's JS
        if (response.valid) {
          if (manifestTimeoutID !== '') {
            clearTimeout(manifestTimeoutID);
            manifestTimeoutID = '';
          }
          window.setTimeout(
            () => processFoundJS(currentOrigin.val, version),
            0,
          );
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
        () => parseFailedJson({node: scriptNodeMaybe, retry: 1500}),
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
    if (FOUND_SCRIPTS.size === 1) {
      FOUND_SCRIPTS.get(FOUND_SCRIPTS.keys().next().value).push({
        src: scriptNodeMaybe.src,
        otherType: otherType, // TODO: read from DOM when available
      });
    }
  } else {
    // no src, access innerHTML for the code
    const hashLookupAttribute =
      scriptNodeMaybe.attributes['data-binary-transparency-hash-key'];
    const hashLookupKey = hashLookupAttribute && hashLookupAttribute.value;
    if (FOUND_SCRIPTS.size === 1) {
      FOUND_SCRIPTS.get(FOUND_SCRIPTS.keys().next().value).push({
        type: MESSAGE_TYPE.RAW_JS,
        rawjs: scriptNodeMaybe.innerHTML,
        lookupKey: hashLookupKey,
        otherType: otherType, // TODO: read from DOM when available
      });
    }
  }
  updateCurrentState(STATES.PROCESSING);
}

function checkNodeForViolations(element: Element) {
  checkElementForViolatingJSURI(element);
  checkElementForViolatingAttributes(element);
}

export function hasInvalidScripts(scriptNodeMaybe: Node) {
  // if not an HTMLElement ignore it!
  if (scriptNodeMaybe.nodeType !== 1) {
    return;
  }

  checkNodeForViolations(scriptNodeMaybe as Element);

  if (scriptNodeMaybe.nodeName.toLowerCase() === 'script') {
    storeFoundJS(scriptNodeMaybe);
  } else if (scriptNodeMaybe.childNodes.length > 0) {
    scriptNodeMaybe.childNodes.forEach(childNode => {
      hasInvalidScripts(childNode);
    });
  }
}

export const scanForScripts = () => {
  const allElements = document.getElementsByTagName('*');

  Array.from(allElements).forEach(element => {
    checkNodeForViolations(element);
    // next check for existing script elements and if they're violating
    if (element.nodeName.toLowerCase() === 'script') {
      storeFoundJS(element);
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

/**
 * Return text from the response object. The main purpose of this method is to
 * extract and parse sourceURL and sourceMappingURL comments from inlined data
 * scripts.
 * Note that this function consumes the response body!
 *
 * @param {Response} response Response will be consumed!
 * @returns string Response text if the sourceURL is valid
 */
async function genSourceText(response) {
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
  if (
    sourceTextParts[sourceTextParts.length - 1].startsWith('//# sourceURL=')
  ) {
    const sourceURL = sourceTextParts.pop().split('//# sourceURL=')[1] ?? '';
    if (!sourceURL.startsWith('http')) {
      throw new Error(`Invalid sourceUrl in inlined data script: ${sourceURL}`);
    }
  }
  while (
    sourceTextParts[sourceTextParts.length - 1] === '\n' ||
    sourceTextParts[sourceTextParts.length - 1].startsWith(
      '//# sourceMappingURL=',
    )
  ) {
    sourceTextParts.pop();
  }
  return sourceTextParts.join('\n').trim();
}

async function processJSWithSrc(script, origin, version) {
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
        sendMessage(
          {
            type: MESSAGE_TYPE.RAW_JS,
            rawjs: jsPackage.trimStart(),
            origin: origin,
            version: version,
          },
          response => {
            if (response.valid) {
              resolve(null);
            } else {
              reject(response.type);
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

export const processFoundJS = async (origin, version) => {
  const fullscripts = FOUND_SCRIPTS.get(version).splice(0);
  const scripts = fullscripts.filter(script => {
    if (
      script.otherType === currentFilterType ||
      ['BOTH', ''].includes(currentFilterType)
    ) {
      return true;
    } else {
      FOUND_SCRIPTS.get(version).push(script);
    }
  });
  let pendingScriptCount = scripts.length;
  for (const script of scripts) {
    if (script.src) {
      await processJSWithSrc(script, origin, version).then(response => {
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
        sendMessage({
          type: MESSAGE_TYPE.DEBUG,
          log:
            'processed JS with SRC, ' +
            script.src +
            ',response is ' +
            JSON.stringify(response).substring(0, 500),
        });
      });
    } else {
      sendMessage(
        {
          type: script.type,
          rawjs: script.rawjs.trimStart(),
          origin: origin,
          version: version,
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
          sendMessage({
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
  window.setTimeout(() => processFoundJS(origin, version), 3000);
};

function parseFailedJson(queuedJsonToParse) {
  try {
    JSON.parse(queuedJsonToParse.node.textContent);
  } catch (parseError) {
    if (queuedJsonToParse.retry > 0) {
      queuedJsonToParse.retry--;
      setTimeout(() => parseFailedJson(queuedJsonToParse), 20);
    } else {
      updateCurrentState(STATES.INVALID);
    }
  }
}

function isPathnameExcluded(excludedPathnames) {
  let pathname = location.pathname;
  if (!pathname.endsWith('/')) {
    pathname = pathname + '/';
  }
  return excludedPathnames.some(rule => {
    if (typeof rule === 'string') {
      return pathname === rule;
    } else {
      const match = pathname.match(rule);
      return match != null && match[0] === pathname;
    }
  });
}

export function startFor(origin, excludedPathnames = []) {
  sendMessage(
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
  if ([ORIGIN_TYPE.FACEBOOK, ORIGIN_TYPE.MESSENGER].includes(origin)) {
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
    updateCurrentState(STATES.INVALID);
  }
});

function sendMessage<R = any>(
  message: MessagePayload,
  callback?: (response: R) => void,
): void {
  chrome.runtime.sendMessage(message, callback);
}
