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
  'onariarequest',
  'onautocomplete',
  'onautocompleteerror',
  'onauxclick',
  'onbeforeactivate',
  'onbeforecopy',
  'onbeforecut',
  'onbeforedeactivate',
  'onbeforeeditfocus',
  'onbeforepaste',
  'onbeforeprint',
  'onbeforescriptexecute',
  'onbeforeunload',
  'onbeforeupdate',
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
  'onseek',
  'onseeked',
  'onseeking',
  'onselect',
  'onselectionchange',
  'onselectstart',
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
    if (manifestTimeoutID !== '') {
      clearTimeout(manifestTimeoutID);
      manifestTimeoutID = '';
    }
    const rawManifest = JSON.parse(scriptNodeMaybe.innerHTML);

    let leaves = rawManifest.leaves;
    let otherHashes = '';
    let otherType = '';
    let roothash = rawManifest.root;
    let version = rawManifest.version;

    if ([ORIGIN_TYPE.FACEBOOK].includes(currentOrigin)) {
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
          // TODO add Error state here, manifest didn't validate
          currentState = ICON_STATE.INVALID_SOFT;
          chrome.runtime.sendMessage({
            type: MESSAGE_TYPE.UPDATE_ICON,
            icon: ICON_STATE.INVALID_SOFT,
          });
        }
      }
    );
    // TODO: start timeout to check if manifest hasn't loaded?
  }
  if (
    scriptNodeMaybe.getAttribute('type') === 'application/json' ||
    (scriptNodeMaybe.src != null &&
      scriptNodeMaybe.src !== '' &&
      scriptNodeMaybe.src.indexOf('blob:') === 0)
  ) {
    // ignore innocuous data.
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

export function hasViolatingJavaScriptURI(htmlElement) {
  console.log('node name is ', htmlElement.nodeName.toLowerCase());
  let checkURL = '';
  if (htmlElement.nodeName.toLowerCase() === 'a' && htmlElement.href !== '') {
    checkURL = checkURL = htmlElement.href.toLowerCase();
  }
  if (
    htmlElement.nodeName.toLowerCase() === 'iframe' &&
    htmlElement.src != ''
  ) {
    checkURL = checkURL = htmlElement.src.toLowerCase();
  }
  if (
    htmlElement.nodeName.toLowerCase() === 'form' &&
    htmlElement.action != ''
  ) {
    checkURL = checkURL = htmlElement.action.toLowerCase();
  }
  if (checkURL !== '') {
    // make sure anchor tags don't have javascript urls
    if (checkURL.indexOf('javascript:') == 0) {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPE.DEBUG,
        log: 'violating attribute: javascript url in anchor tag',
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

export function hasInvalidScripts(scriptNodeMaybe, scriptList) {
  // if not an HTMLElement ignore it!
  if (scriptNodeMaybe.nodeType !== 1) {
    return false;
  }
  hasViolatingJavaScriptURI(scriptNodeMaybe);
  hasInvalidAttributes(scriptNodeMaybe);

  if (scriptNodeMaybe.nodeName.toLowerCase() === 'script') {
    return storeFoundJS(scriptNodeMaybe, scriptList);
  } else if (scriptNodeMaybe.childNodes.length > 0) {
    scriptNodeMaybe.childNodes.forEach(childNode => {
      // if not an HTMLElement ignore it!
      if (childNode.nodeType !== 1) {
        return;
      }
      hasViolatingJavaScriptURI(childNode);
      hasInvalidAttributes(childNode);

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
    console.log('found existing scripts');

    hasViolatingJavaScriptURI(allElement);
    hasInvalidAttributes(allElement);
    // next check for existing script elements and if they're violating
    if (allElement.nodeName.toLowerCase().toLowerCase() === 'script') {
      storeFoundJS(allElement, foundScripts);
    }
  });

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

  scriptMutationObserver.observe(document.getElementsByTagName('html')[0], {
    attributeFilter: DOM_EVENTS,
    childList: true,
    subtree: true,
  });
};

export const processFoundJS = (origin, version) => {
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
  scripts.forEach(script => {
    if (script.src) {
      chrome.runtime.sendMessage(
        {
          type: script.type,
          src: script.src,
          origin: origin,
          version: version,
        },
        response => {
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
        }
      );
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
          if (response.valid) {
            if (pendingScriptCount == 0 && currentState == ICON_STATE.VALID) {
              chrome.runtime.sendMessage({
                type: MESSAGE_TYPE.UPDATE_ICON,
                icon: ICON_STATE.VALID,
              });
            }
          } else {
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
  });
  window.setTimeout(() => processFoundJS(origin, version), 3000);
};

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
