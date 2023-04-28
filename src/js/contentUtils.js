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
} from './config';

import {checkCSPHeaders} from './content/checkCSPHeaders';
import {downloadJSArchive} from './content/downloadJSArchive';
import {currentOrigin, updateCurrentState} from './content/updateCurrentState';

const sourceScripts = new Map();
const inlineScripts = [];
const foundScripts = new Map();
foundScripts.set('', []);
let currentFilterType = '';
let manifestTimeoutID = '';

export function storeFoundJS(scriptNodeMaybe, scriptList) {
  if (window != window.top) {
    // this means that content utils is running in an iframe - disable timer and call processFoundJS on manifest processed in top level frame
    clearTimeout(manifestTimeoutID);
    manifestTimeoutID = '';
    window.setTimeout(
      () => processFoundJS(currentOrigin.val, foundScripts.keys().next().value),
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
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPE.DEBUG,
        log: 'Manifest script type is invalid',
      });
      updateCurrentState(STATES.INVALID);
      return;
    }

    let rawManifest = '';
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
    let otherHashes = '';
    let otherType = '';
    let roothash = rawManifest.root;
    let version = rawManifest.version;

    if (
      [ORIGIN_TYPE.FACEBOOK, ORIGIN_TYPE.MESSENGER].includes(currentOrigin.val)
    ) {
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
    if (foundScripts.has('')) {
      foundScripts.set(version, foundScripts.get(''));
      foundScripts.delete('');
    }

    chrome.runtime.sendMessage(
      {
        type: MESSAGE_TYPE.LOAD_MANIFEST,
        leaves: leaves,
        origin: currentOrigin.val,
        otherHashes: otherHashes,
        otherType: otherType,
        rootHash: roothash,
        workaround: scriptNodeMaybe.innerHTML,
        version: version,
      },
      response => {
        chrome.runtime.sendMessage({
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
    if (scriptList.size === 1) {
      scriptList.get(scriptList.keys().next().value).push({
        src: scriptNodeMaybe.src,
        otherType: otherType, // TODO: read from DOM when available
      });
    }
  } else {
    // no src, access innerHTML for the code
    const hashLookupAttribute =
      scriptNodeMaybe.attributes['data-binary-transparency-hash-key'];
    const hashLookupKey = hashLookupAttribute && hashLookupAttribute.value;
    if (scriptList.size === 1) {
      scriptList.get(scriptList.keys().next().value).push({
        type: MESSAGE_TYPE.RAW_JS,
        rawjs: scriptNodeMaybe.innerHTML,
        lookupKey: hashLookupKey,
        otherType: otherType, // TODO: read from DOM when available
      });
    }
  }
  updateCurrentState(STATES.PROCESSING);
}

function getAttributeValue(
  nodeName,
  checkNode,
  htmlElement,
  attributeName,
  currentAttributeValue,
) {
  if (
    nodeName.toLowerCase() === checkNode &&
    htmlElement.hasAttribute(attributeName)
  ) {
    return htmlElement.getAttribute(attributeName).toLowerCase();
  }
  return currentAttributeValue;
}

const AttributeCheckPairs = [
  {nodeName: 'a', attributeName: 'href'},
  {nodeName: 'iframe', attributeName: 'src'},
  {nodeName: 'iframe', attributeName: 'srcdoc'},
  {nodeName: 'form', attributeName: 'action'},
  {nodeName: 'input', attributeName: 'formaction'},
  {nodeName: 'button', attributeName: 'formaction'},
  {nodeName: 'a', attributeName: 'xlink:href'},
  {nodeName: 'ncc', attributeName: 'href'},
  {nodeName: 'embed', attributeName: 'src'},
  {nodeName: 'object', attributeName: 'data'},
  {nodeName: 'animate', attributeName: 'xlink:href'},
  {nodeName: 'script', attributeName: 'xlink:href'},
  {nodeName: 'use', attributeName: 'href'},
  {nodeName: 'use', attributeName: 'xlink:href'},
  {nodeName: 'x', attributeName: 'href'},
  {nodeName: 'x', attributeName: 'xlink:href'},
];

export function hasViolatingJavaScriptURI(htmlElement) {
  let checkURL = '';
  const lowerCaseNodeName = htmlElement.nodeName.toLowerCase();
  AttributeCheckPairs.forEach(checkPair => {
    checkURL = getAttributeValue(
      lowerCaseNodeName,
      checkPair.nodeName,
      htmlElement,
      checkPair.attributeName,
      checkURL,
    );
  });
  if (checkURL !== '') {
    // make sure anchor tags and object tags don't have javascript urls
    if (checkURL.indexOf('javascript') >= 0) {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPE.DEBUG,
        log: 'violating attribute: javascript url',
      });
      updateCurrentState(STATES.INVALID);
    }
  }
}

function isEventHandlerAttribute(attribute) {
  return attribute.indexOf('on') === 0;
}

export function hasInvalidAttributes(htmlElement) {
  if (
    typeof htmlElement.attributes === 'object' &&
    Object.keys(htmlElement.attributes).length >= 1
  ) {
    Array.from(htmlElement.attributes).forEach(elementAttribute => {
      // check first for violating attributes
      if (isEventHandlerAttribute(elementAttribute.localName)) {
        chrome.runtime.sendMessage({
          type: MESSAGE_TYPE.DEBUG,
          log:
            'violating attribute ' +
            elementAttribute.localName +
            ' from element ' +
            htmlElement.outerHTML,
        });
        updateCurrentState(STATES.INVALID);
      }
    });
  }
  // if the element is a math element, check all the attributes of the child node to ensure that there are on href or xlink:href attributes with javascript urls

  if (
    htmlElement.tagName.toLowerCase() === 'math' &&
    Object.keys(htmlElement.attributes).length >= 1
  ) {
    Array.from(htmlElement.attributes).forEach(elementAttribute => {
      if (
        (elementAttribute.localName === 'href' ||
          elementAttribute.localName === 'xlink:href') &&
        htmlElement
          .getAttribute(elementAttribute.localName)
          .toLowerCase()
          .startsWith('javascript')
      ) {
        chrome.runtime.sendMessage({
          type: MESSAGE_TYPE.DEBUG,
          log:
            'violating attribute ' +
            elementAttribute.localName +
            ' from element ' +
            htmlElement.outerHTML,
        });
        updateCurrentState(STATES.INVALID);
      }
    });
  }
}

function checkNodeForViolations(element) {
  hasViolatingJavaScriptURI(element);
  hasInvalidAttributes(element);
}

export function hasInvalidScripts(scriptNodeMaybe, scriptList) {
  // if not an HTMLElement ignore it!
  if (scriptNodeMaybe.nodeType !== 1) {
    return false;
  }
  checkNodeForViolations(scriptNodeMaybe);

  if (scriptNodeMaybe.nodeName.toLowerCase() === 'script') {
    return storeFoundJS(scriptNodeMaybe, scriptList);
  } else if (scriptNodeMaybe.childNodes.length > 0) {
    scriptNodeMaybe.childNodes.forEach(childNode => {
      // if not an HTMLElement ignore it!
      if (childNode.nodeType !== 1) {
        return;
      }
      checkNodeForViolations(childNode);
      if (childNode.nodeName.toLowerCase() === 'script') {
        storeFoundJS(childNode, scriptList);
        return;
      }

      Array.from(childNode.getElementsByTagName('script')).forEach(
        childScript => {
          storeFoundJS(childScript, scriptList);
        },
      );
    });
  }

  return;
}

export const scanForScripts = () => {
  const allElements = document.getElementsByTagName('*');

  Array.from(allElements).forEach(element => {
    checkNodeForViolations(element);
    // next check for existing script elements and if they're violating
    if (element.nodeName.toLowerCase() === 'script') {
      storeFoundJS(element, foundScripts);
    }
  });

  try {
    // track any new scripts that get loaded in
    const scriptMutationObserver = new MutationObserver(mutationsList => {
      mutationsList.forEach(mutation => {
        if (mutation.type === 'childList') {
          Array.from(mutation.addedNodes).forEach(checkScript => {
            hasInvalidScripts(checkScript, foundScripts);
          });
        } else if (
          mutation.type === 'attributes' &&
          checkNodeForViolations(mutation.target, false)
        ) {
          updateCurrentState(STATES.INVALID);
          chrome.runtime.sendMessage({
            type: MESSAGE_TYPE.DEBUG,
            log:
              'Processed DOM mutation and invalid attribute added or changed ' +
              mutation.target,
          });
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
    const sourceResponse = await fetch(script.src, {method: 'GET'});
    if (DOWNLOAD_JS_ENABLED) {
      const fileNameArr = script.src.split('/');
      const fileName = fileNameArr[fileNameArr.length - 1].split('?')[0];
      sourceScripts.set(
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
        chrome.runtime.sendMessage(
          {
            type: MESSAGE_TYPE.RAW_JS,
            rawjs: jsPackage.trimStart(),
            origin: origin,
            version: version,
          },
          response => {
            if (response.valid) {
              resolve();
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
  // foundScripts
  const fullscripts = foundScripts.get(version).splice(0);
  const scripts = fullscripts.filter(script => {
    if (
      script.otherType === currentFilterType ||
      ['BOTH', ''].includes(currentFilterType)
    ) {
      return true;
    } else {
      foundScripts.get(version).push(script);
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
        chrome.runtime.sendMessage({
          type: MESSAGE_TYPE.DEBUG,
          log:
            'processed JS with SRC, ' +
            script.src +
            ',response is ' +
            JSON.stringify(response).substring(0, 500),
        });
      });
    } else {
      chrome.runtime.sendMessage(
        {
          type: script.type,
          rawjs: script.rawjs.trimStart(),
          lookupKey: script.lookupKey,
          origin: origin,
          version: version,
        },
        response => {
          pendingScriptCount--;
          let inlineScriptMap = new Map();
          if (response.valid) {
            inlineScriptMap.set(response.hash, script.rawjs);
            inlineScripts.push(inlineScriptMap);
            if (pendingScriptCount == 0) {
              updateCurrentState(STATES.VALID);
            }
          } else {
            // using an array of maps, as we're using the same key for inline scripts - this will eventually be removed, once inline scripts are removed from the page load
            inlineScriptMap.set('hash not in manifest', script.rawjs);
            inlineScripts.push(inlineScriptMap);
            if (KNOWN_EXTENSION_HASHES.includes(response.hash)) {
              updateCurrentState(STATES.RISK);
            } else {
              updateCurrentState(STATES.INVALID);
            }
          }
          chrome.runtime.sendMessage({
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
  chrome.runtime
    .sendMessage({
      type: MESSAGE_TYPE.CONTENT_SCRIPT_START,
      origin,
    })
    .then(resp => {
      if (
        [ORIGIN_TYPE.FACEBOOK, ORIGIN_TYPE.MESSENGER].includes(
          currentOrigin.val,
        )
      ) {
        checkCSPHeaders(resp.cspHeader, resp.cspReportHeader);
      }
    });
  if (isPathnameExcluded(excludedPathnames)) {
    updateCurrentState(STATES.IGNORE);
    return;
  }
  let isUserLoggedIn = false;
  if ([ORIGIN_TYPE.FACEBOOK, ORIGIN_TYPE.MESSENGER].includes(origin)) {
    const cookies = document.cookie.split(';');
    cookies.forEach(cookie => {
      let pair = cookie.split('=');
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
      manifestTimeoutID = setTimeout(() => {
        // Manifest failed to load, flag a warning to the user.
        updateCurrentState(STATES.TIMEOUT);
      }, 45000);
    }
  }
}

chrome.runtime.onMessage.addListener(function (request) {
  if (request.greeting === 'downloadSource' && DOWNLOAD_JS_ENABLED) {
    downloadJSArchive(sourceScripts, inlineScripts);
  } else if (request.greeting === 'nocacheHeaderFound') {
    updateCurrentState(STATES.INVALID);
  }
});
