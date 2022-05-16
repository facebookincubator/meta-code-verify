/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  ICON_STATE,
  KNOWN_EXTENSION_HASHES,
  MESSAGE_TYPE,
  ORIGIN_TYPE,
} from './config.js';

const DOM_EVENTS = [
  'onabort',
  'onactivate',
  'onattribute',
  'onafterprint',
  'onafterscriptexecute',
  'onafterupdate',
  'onanimationcancel',
  'onanimationend',
  'onanimationiteration',
  'onanimationstart',
  'onappinstalled',
  'onariarequest',
  'onautocomplete',
  'onautocompleteerror',
  'onauxclick',
  'onbeforeactivate',
  'onbeforecopy',
  'onbeforecut',
  'onbeforedeactivate',
  'onbeforeeditfocus',
  'onbeforeinstallprompt',
  'onbeforepaste',
  'onbeforeprint',
  'onbeforescriptexecute',
  'onbeforeunload',
  'onbeforeupdate',
  'onbeforexrselect',
  'onbegin',
  'onblur',
  'onbounce',
  'oncancel',
  'oncanplay',
  'oncanplaythrough',
  'oncellchange',
  'onchange',
  'onclick',
  'onclose',
  'oncommand',
  'oncompassneedscalibration',
  'oncontextmenu',
  'oncontrolselect',
  'oncopy',
  'oncuechange',
  'oncut',
  'ondataavailable',
  'ondatasetchanged',
  'ondatasetcomplete',
  'ondblclick',
  'ondeactivate',
  'ondevicelight',
  'ondevicemotion',
  'ondeviceorientation',
  'ondeviceorientationabsolute',
  'ondeviceproximity',
  'ondrag',
  'ondragdrop',
  'ondragend',
  'ondragenter',
  'ondragleave',
  'ondragover',
  'ondragstart',
  'ondrop',
  'ondurationchange',
  'onemptied',
  'onend',
  'onended',
  'onerror',
  'onerrorupdate',
  'onexit',
  'onfilterchange',
  'onfinish',
  'onfocus',
  'onfocusin',
  'onfocusout',
  'onformchange',
  'onformdata',
  'onforminput',
  'onfullscreenchange',
  'onfullscreenerror',
  'ongotpointercapture',
  'onhashchange',
  'onhelp',
  'oninput',
  'oninvalid',
  'onkeydown',
  'onkeypress',
  'onkeyup',
  'onlanguagechange',
  'onlayoutcomplete',
  'onload',
  'onloadeddata',
  'onloadedmetadata',
  'onloadend',
  'onloadstart',
  'onlosecapture',
  'onlostpointercapture',
  'onmediacomplete',
  'onmediaerror',
  'onmessage',
  'onmessageerror',
  'onmousedown',
  'onmouseenter',
  'onmouseleave',
  'onmousemove',
  'onmouseout',
  'onmouseover',
  'onmouseup',
  'onmousewheel',
  'onmove',
  'onmoveend',
  'onmovestart',
  'onmozfullscreenchange',
  'onmozfullscreenerror',
  'onmozpointerlockchange',
  'onmozpointerlockerror',
  'onmscontentzoom',
  'onmsfullscreenchange',
  'onmsfullscreenerror',
  'onmsgesturechange',
  'onmsgesturedoubletap',
  'onmsgestureend',
  'onmsgesturehold',
  'onmsgesturestart',
  'onmsgesturetap',
  'onmsgotpointercapture',
  'onmsinertiastart',
  'onmslostpointercapture',
  'onmsmanipulationstatechanged',
  'onmspointercancel',
  'onmspointerdown',
  'onmspointerenter',
  'onmspointerleave',
  'onmspointermove',
  'onmspointerout',
  'onmspointerover',
  'onmspointerup',
  'onmssitemodejumplistitemremoved',
  'onmsthumbnailclick',
  'onoffline',
  'ononline',
  'onoutofsync',
  'onpage',
  'onpagehide',
  'onpageshow',
  'onpaste',
  'onpause',
  'onplay',
  'onplaying',
  'onpointercancel',
  'onpointerdown',
  'onpointerenter',
  'onpointerleave',
  'onpointerlockchange',
  'onpointerlockerror',
  'onpointermove',
  'onpointerout',
  'onpointerover',
  'onpointerrawupdate',
  'onpointerup',
  'onpopstate',
  'onprogress',
  'onpropertychange',
  'onratechange',
  'onreadystatechange',
  'onreceived',
  'onrejectionhandled',
  'onrepeat',
  'onreset',
  'onresize',
  'onresizeend',
  'onresizestart',
  'onresume',
  'onreverse',
  'onrowdelete',
  'onrowenter',
  'onrowexit',
  'onrowinserted',
  'onrowsdelete',
  'onrowsenter',
  'onrowsexit',
  'onrowsinserted',
  'onscroll',
  'onsearch',
  'onsecuritypolicyviolation',
  'onseek',
  'onseeked',
  'onseeking',
  'onselect',
  'onselectionchange',
  'onselectstart',
  'onslotchange',
  'onstalled',
  'onstorage',
  'onstoragecommit',
  'onstart',
  'onstop',
  'onshow',
  'onsyncrestored',
  'onsubmit',
  'onsuspend',
  'onsynchrestored',
  'ontimeerror',
  'ontimeupdate',
  'ontoggle',
  'ontouchend',
  'ontouchmove',
  'ontouchstart',
  'ontrackchange',
  'ontransitioncancel',
  'ontransitionend',
  'ontransitionrun',
  'ontransitionstart',
  'onunhandledrejection',
  'onunload',
  'onurlflip',
  'onuserproximity',
  'onvolumechange',
  'onwaiting',
  'onwebkitanimationend',
  'onwebkitanimationiteration',
  'onwebkitanimationstart',
  'onwebkitfullscreenchange',
  'onwebkitfullscreenerror',
  'onwebkittransitionend',
  'onwheel',
];
const sourceScripts = new Map();
const inlineScripts = [];
const foundScripts = new Map();
foundScripts.set('', []);
let currentState = ICON_STATE.VALID;
let currentOrigin = '';
let currentFilterType = '';
let manifestTimeoutID = '';

export function storeFoundJS(scriptNodeMaybe, scriptList) {
  // check if it's the manifest node
  if (
    scriptNodeMaybe.id === 'binary-transparency-manifest' ||
    scriptNodeMaybe.getAttribute('name') === 'binary-transparency-manifest'
  ) {
    let rawManifest = '';
    try {
      rawManifest = JSON.parse(scriptNodeMaybe.innerHTML);
    } catch (manifestParseError) {
      currentState = ICON_STATE.INVALID_SOFT;
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPE.UPDATE_ICON,
        icon: ICON_STATE.INVALID_SOFT,
      });
      return;
    }

    let leaves = rawManifest.leaves;
    let otherHashes = '';
    let otherType = '';
    let roothash = rawManifest.root;
    let version = rawManifest.version;

    if ([ORIGIN_TYPE.FACEBOOK, ORIGIN_TYPE.MESSENGER].includes(currentOrigin)) {
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
    // now that we know the actual version of the scripts, transfer the ones we know about.
    if (foundScripts.has('')) {
      foundScripts.set(version, foundScripts.get(''));
      foundScripts.delete('');
    }

    chrome.runtime.sendMessage(
      {
        type: MESSAGE_TYPE.LOAD_MANIFEST,
        leaves: leaves,
        origin: currentOrigin,
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
          window.setTimeout(() => processFoundJS(currentOrigin, version), 0);
        } else {
          if (
            ['ENDPOINT_FAILURE', 'UNKNOWN_ENDPOINT_ISSUE'].includes(
              response.reason
            )
          ) {
            currentState = ICON_STATE.WARNING_TIMEOUT;
            chrome.runtime.sendMessage({
              type: MESSAGE_TYPE.UPDATE_ICON,
              icon: ICON_STATE.WARNING_TIMEOUT,
            });
            return;
          }
          currentState = ICON_STATE.INVALID_SOFT;
          chrome.runtime.sendMessage({
            type: MESSAGE_TYPE.UPDATE_ICON,
            icon: ICON_STATE.INVALID_SOFT,
          });
        }
      }
    );
  }

  if (scriptNodeMaybe.getAttribute('type') === 'application/json') {
    try {
      JSON.parse(scriptNodeMaybe.textContent);
    } catch (parseError) {
      currentState = ICON_STATE.INVALID_SOFT;
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPE.UPDATE_ICON,
        icon: ICON_STATE.INVALID_SOFT,
      });
    }
    return;
  }
  if (
    scriptNodeMaybe.src != null &&
    scriptNodeMaybe.src !== '' &&
    scriptNodeMaybe.src.indexOf('blob:') === 0
  ) {
    // TODO: try to process the blob. For now, flag as warning.
    currentState = ICON_STATE.INVALID_SOFT;
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPE.UPDATE_ICON,
      icon: ICON_STATE.INVALID_SOFT,
    });
    return;
  }
  // need to get the src of the JS
  if (scriptNodeMaybe.src != null && scriptNodeMaybe.src !== '') {
    if (scriptList.size === 1) {
      scriptList.get(scriptList.keys().next().value).push({
        type: MESSAGE_TYPE.JS_WITH_SRC,
        src: scriptNodeMaybe.src,
        otherType: '', // TODO: read from DOM when available
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
        otherType: '', // TODO: read from DOM when available
      });
    }
  }
  if (currentState == ICON_STATE.VALID) {
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPE.UPDATE_ICON,
      icon: ICON_STATE.PROCESSING,
    });
  }
}

function getAttributeValue(
  nodeName,
  checkNode,
  htmlElement,
  attributeName,
  currentAttributeValue
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
  { nodeName: 'a', attributeName: 'href' },
  { nodeName: 'iframe', attributeName: 'src' },
  { nodeName: 'iframe', attributeName: 'srcdoc' },
  { nodeName: 'form', attributeName: 'action' },
  { nodeName: 'input', attributeName: 'formaction' },
  { nodeName: 'button', attributeName: 'formaction' },
  { nodeName: 'a', attributeName: 'xlink:href' },
  { nodeName: 'ncc', attributeName: 'href' },
  { nodeName: 'embed', attributeName: 'src' },
  { nodeName: 'object', attributeName: 'data'}
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
      checkURL
    );
  });
  if (checkURL !== '') {
    // make sure anchor tags and object tags don't have javascript urls
    if (checkURL.indexOf('javascript:') == 0) {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPE.DEBUG,
        log: 'violating attribute: javascript url',
      });
      currentState = ICON_STATE.INVALID_SOFT;
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPE.UPDATE_ICON,
        icon: ICON_STATE.INVALID_SOFT,
      });
    }
  }

  if (typeof htmlElement.childNodes !== 'undefined') {
    htmlElement.childNodes.forEach(element => {
      hasViolatingJavaScriptURI(element);
    });
  }
}

export function hasInvalidAttributes(htmlElement) {
  if (
    typeof htmlElement.attributes === 'object' &&
    Object.keys(htmlElement.attributes).length >= 1
  ) {
    Array.from(htmlElement.attributes).forEach(elementAttribute => {
      // check first for violating attributes
      if (DOM_EVENTS.indexOf(elementAttribute.localName) >= 0) {
        chrome.runtime.sendMessage({
          type: MESSAGE_TYPE.DEBUG,
          log:
            'violating attribute ' +
            elementAttribute.localName +
            ' from element ' +
            htmlElement.outerHTML,
        });
        currentState = ICON_STATE.INVALID_SOFT;
        chrome.runtime.sendMessage({
          type: MESSAGE_TYPE.UPDATE_ICON,
          icon: ICON_STATE.INVALID_SOFT,
        });
      }
    });
  }
}

function checkNodesForViolations(element) {
  hasViolatingJavaScriptURI(element);
  hasInvalidAttributes(element);
}

export function hasInvalidScripts(scriptNodeMaybe, scriptList) {
  // if not an HTMLElement ignore it!
  if (scriptNodeMaybe.nodeType !== 1) {
    return false;
  }
  checkNodesForViolations(scriptNodeMaybe);

  if (scriptNodeMaybe.nodeName.toLowerCase() === 'script') {
    return storeFoundJS(scriptNodeMaybe, scriptList);
  } else if (scriptNodeMaybe.childNodes.length > 0) {
    scriptNodeMaybe.childNodes.forEach(childNode => {
      // if not an HTMLElement ignore it!
      if (childNode.nodeType !== 1) {
        return;
      }
      checkNodesForViolations(childNode);

      if (childNode.nodeName.toLowerCase() === 'script') {
        storeFoundJS(childNode, scriptList);
        return;
      }

      Array.from(childNode.getElementsByTagName('script')).forEach(
        childScript => {
          storeFoundJS(childScript, scriptList);
        }
      );
    });
  }

  return;
}

export const scanForScripts = () => {
  const allElements = document.getElementsByTagName('*');

  Array.from(allElements).forEach(allElement => {
    checkNodesForViolations(allElement);
    // next check for existing script elements and if they're violating
    if (allElement.nodeName.toLowerCase() === 'script') {
      storeFoundJS(allElement, foundScripts);
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
        } else if (mutation.type === 'attributes') {
          currentState = ICON_STATE.INVALID_SOFT;
          chrome.runtime.sendMessage({
            type: MESSAGE_TYPE.UPDATE_ICON,
            icon: ICON_STATE.INVALID_SOFT,
          });
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
      attributeFilter: DOM_EVENTS,
      childList: true,
      subtree: true,
    });
  } catch (_UnknownError) {
    currentState = ICON_STATE.INVALID_SOFT;
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPE.UPDATE_ICON,
      icon: ICON_STATE.INVALID_SOFT,
    });
  }
};

async function processJSWithSrc(script, origin, version) {
  // fetch the script from page context, not the extension context.
  try {
    const sourceResponse = await fetch(script.src, { method: 'GET' });
    // we want to clone the stream before reading it
    const sourceResponseClone = sourceResponse.clone();
    const fileNameArr = script.src.split('/');
    const fileName = fileNameArr[fileNameArr.length - 1].split('?')[0];
    let sourceText = await sourceResponse.text();
    sourceScripts.set(
      fileName,
      sourceResponseClone.body.pipeThrough(new window.CompressionStream('gzip'))
    );
    let fbOrigin = [ORIGIN_TYPE.FACEBOOK, ORIGIN_TYPE.MESSENGER].includes(
      origin
    );
    if (fbOrigin && sourceText.indexOf('if (self.CavalryLogger) {') === 0) {
      sourceText = sourceText.slice(82).trim();
    }
    // we want to slice out the source URL from the source
    const sourceURLIndex = sourceText.indexOf('//# sourceURL');
    // if //# sourceURL is at the beginning of the response, sourceText should be empty, otherwise slicing indices will be (0, -1) and sourceText will be unchanged
    if(sourceURLIndex == 0) {
      sourceText = '';
    }
    else if (sourceURLIndex > 0) {
      // doing minus 1 because there's usually either a space or new line
      sourceText = sourceText.slice(0, sourceURLIndex - 1);
    }
    // strip i18n delimiters
    // eslint-disable-next-line no-useless-escape
    const i18nRegexp = /\/\*FBT_CALL\*\/.*?\/\*FBT_CALL\*\//g;
    let i18nStripped = sourceText;
    if (fbOrigin) {
      i18nStripped = sourceText.replace(i18nRegexp, '');
    }
    // split package up if necessary
    const packages = i18nStripped.split('/*FB_PKG_DELIM*/\n');
    const packagePromises = packages.map(jsPackage => {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: MESSAGE_TYPE.RAW_JS,
            rawjs: jsPackage,
            origin: origin,
            version: version,
          },
          response => {
            if (response.valid) {
              resolve();
            } else {
              reject(response.type);
            }
          }
        );
      });
    });
    await Promise.all(packagePromises);
    return {
      valid: true,
    };
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
          if (pendingScriptCount == 0 && currentState == ICON_STATE.VALID) {
            chrome.runtime.sendMessage({
              type: MESSAGE_TYPE.UPDATE_ICON,
              icon: ICON_STATE.VALID,
            });
          }
        } else {
          if (response.type === 'EXTENSION') {
            currentState = ICON_STATE.WARNING_RISK;
            chrome.runtime.sendMessage({
              type: MESSAGE_TYPE.UPDATE_ICON,
              icon: ICON_STATE.WARNING_RISK,
            });
          } else {
            currentState = ICON_STATE.INVALID_SOFT;
            chrome.runtime.sendMessage({
              type: MESSAGE_TYPE.UPDATE_ICON,
              icon: ICON_STATE.INVALID_SOFT,
            });
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
          rawjs: script.rawjs,
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
            if (pendingScriptCount == 0 && currentState == ICON_STATE.VALID) {
              chrome.runtime.sendMessage({
                type: MESSAGE_TYPE.UPDATE_ICON,
                icon: ICON_STATE.VALID,
              });
            }
          } else {
            // using an array of maps, as we're using the same key for inline scripts - this will eventually be removed, once inline scripts are removed from the page load
            inlineScriptMap.set('hash not in manifest', script.rawjs);
            inlineScripts.push(inlineScriptMap);
            if (KNOWN_EXTENSION_HASHES.includes(response.hash)) {
              currentState = ICON_STATE.WARNING_RISK;
              chrome.runtime.sendMessage({
                type: MESSAGE_TYPE.UPDATE_ICON,
                icon: ICON_STATE.WARNING_RISK,
              });
            } else {
              currentState = ICON_STATE.INVALID_SOFT;
              chrome.runtime.sendMessage({
                type: MESSAGE_TYPE.UPDATE_ICON,
                icon: ICON_STATE.INVALID_SOFT,
              });
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
        }
      );
    }
  }
  window.setTimeout(() => processFoundJS(origin, version), 3000);
};

async function downloadJSToZip() {
  const fileHandle = await window.showSaveFilePicker({
    suggestedName: 'meta_source_files.gz',
  });

  const writableStream = await fileHandle.createWritable();
  // delimiter between files
  const delimPrefix = '\n********** new file: ';
  const delimSuffix = ' **********\n';
  const enc = new TextEncoder();

  for (const [fileName, compressedStream] of sourceScripts.entries()) {
    let delim = delimPrefix + fileName + delimSuffix;
    let encodedDelim = enc.encode(delim);
    let delimStream = new window.CompressionStream('gzip');
    let writer = delimStream.writable.getWriter();
    writer.write(encodedDelim);
    writer.close();
    await delimStream.readable.pipeTo(writableStream, { preventClose: true });
    await compressedStream.pipeTo(writableStream, { preventClose: true });
  }

  for (const inlineSrcMap of inlineScripts) {
    let inlineHash = inlineSrcMap.keys().next().value;
    let inlineSrc = inlineSrcMap.values().next().value;
    let delim = delimPrefix + 'Inline Script ' + inlineHash + delimSuffix;
    let encodedDelim = enc.encode(delim);
    let delimStream = new window.CompressionStream('gzip');
    let delimWriter = delimStream.writable.getWriter();
    delimWriter.write(encodedDelim);
    delimWriter.close();
    await delimStream.readable.pipeTo(writableStream, { preventClose: true });
    let inlineStream = new window.CompressionStream('gzip');
    let writer = inlineStream.writable.getWriter();
    writer.write(enc.encode(inlineSrc));
    writer.close();
    await inlineStream.readable.pipeTo(writableStream, { preventClose: true });
  }
  writableStream.close();
}

chrome.runtime.onMessage.addListener(function (request) {
  if (request.greeting === 'downloadSource') {
    downloadJSToZip();
  } else if (request.greeting === 'nocacheHeaderFound') {
    currentState = ICON_STATE.INVALID_SOFT;
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPE.UPDATE_ICON,
      icon: ICON_STATE.INVALID_SOFT,
    });
  }
});

export function startFor(origin) {
  currentOrigin = origin;
  scanForScripts();
  manifestTimeoutID = setTimeout(() => {
    // Manifest failed to load, flag a warning to the user.
    currentState = ICON_STATE.WARNING_TIMEOUT;
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPE.UPDATE_ICON,
      icon: ICON_STATE.WARNING_TIMEOUT,
    });
  }, 45000);
}

chrome.runtime.sendMessage({
  type: MESSAGE_TYPE.UPDATE_ICON,
  icon: ICON_STATE.PROCESSING,
});
