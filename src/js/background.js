/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  MESSAGE_TYPE,
  ORIGIN_HOST,
  ORIGIN_TIMEOUT,
  ORIGIN_TYPE,
} from './config.js';

import {
  recordContentScriptStart,
  updateContentScriptState,
} from './tab_state_tracker/tabStateTracker.js';

const manifestCache = new Map();
const debugCache = new Map();

// Emulate PageActions
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.disable();
});

function updateIconV3(message, sender) {
  chrome.action.setIcon({ tabId: sender.tab.id, path: message.icon.badge });
  const popupMessage = {
    tabId: sender.tab.id,
    popup: message.icon.popup,
  };
  chrome.action.setPopup(popupMessage);
  const messageForPopup = {
    popup: message.icon.popup,
    tabId: sender.tab.id,
  };
  chrome.runtime.sendMessage(messageForPopup);
  chrome.action.enable(sender.tab.id);
}

function updateIconV2(message, sender) {
  chrome.pageAction.setIcon({ tabId: sender.tab.id, path: message.icon.badge });
  const popupMessage = {
    tabId: sender.tab.id,
    popup: message.icon.popup,
  };
  chrome.pageAction.setPopup(popupMessage);
  const messageForPopup = {
    popup: message.icon.popup,
    tabId: sender.tab.id,
  };
  chrome.runtime.sendMessage(messageForPopup);
  chrome.pageAction.show(sender.tab.id);
}

function updateIcon(message, sender) {
  console.log('background messages are ', message);
  if (chrome.pageAction) {
    updateIconV2(message, sender);
  } else {
    updateIconV3(message, sender);
  }
}

function addDebugLog(tabId, debugMessage) {
  let tabDebugList = debugCache.get(tabId);
  if (tabDebugList == null) {
    tabDebugList = [];
    debugCache.set(tabId, tabDebugList);
  }

  tabDebugList.push(debugMessage);
}

const fromHexString = hexString =>
  new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
const toHexString = bytes =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');

function getCFHashWorkaroundFunction(host, version) {
  return new Promise((resolve, reject) => {
    fetch(
      'https://staging-api.privacy-auditability.cloudflare.com/v1/hash/' +
        encodeURIComponent(host) +
        '/' +
        encodeURIComponent(version),
      { method: 'GET' }
    )
      .then(response => {
        resolve(response);
      })
      .catch(response => {
        reject(response);
      });
  });
}

async function validateManifest(rootHash, leaves, host, version, workaround) {
  // does rootHash match what was published?
  const cfResponse = await getCFHashWorkaroundFunction(host, version).catch(
    cfError => {
      console.log('error fetching hash from CF', cfError);
      return {
        valid: false,
        reason: 'ENDPOINT_FAILURE',
        error: cfError,
      };
    }
  );
  if (cfResponse == null || cfResponse.json == null) {
    return {
      valid: false,
      reason: 'UNKNOWN_ENDPOINT_ISSUE',
    };
  }
  const cfPayload = await cfResponse.json();
  let cfRootHash = cfPayload.root_hash;
  if (cfPayload.root_hash.startsWith('0x')) {
    cfRootHash = cfPayload.root_hash.slice(2);
  }
  // validate
  if (rootHash !== cfRootHash) {
    console.log('hash mismatch with CF ', rootHash, cfRootHash);

    // secondary hash to mitigate accidental build issue.
    const encoder = new TextEncoder();
    const backupHashEncoded = encoder.encode(workaround);
    const backupHashArray = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', backupHashEncoded))
    );
    const backupHash = backupHashArray
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    console.log(
      'secondary hashing of CF value fails too ',
      rootHash,
      backupHash
    );
    if (backupHash !== cfRootHash) {
      return {
        valid: false,
        reason: 'ROOT_HASH_VERFIY_FAIL_3RD_PARTY',
      };
    }
  }

  let oldhashes = leaves.map(
    leaf => fromHexString(leaf.replace('0x', '')).buffer
  );
  let newhashes = [];
  let bonus = '';

  while (oldhashes.length > 1) {
    for (let index = 0; index < oldhashes.length; index += 2) {
      const validSecondValue = index + 1 < oldhashes.length;
      if (validSecondValue) {
        const hashValue = new Uint8Array(
          oldhashes[index].byteLength + oldhashes[index + 1].byteLength
        );
        hashValue.set(new Uint8Array(oldhashes[index]), 0);
        hashValue.set(
          new Uint8Array(oldhashes[index + 1]),
          oldhashes[index].byteLength
        );
        newhashes.push(await crypto.subtle.digest('SHA-256', hashValue.buffer));
      } else {
        bonus = oldhashes[index];
      }
    }
    oldhashes = newhashes;
    if (bonus !== '') {
      oldhashes.push(bonus);
    }
    console.log(
      'layer hex is ',
      oldhashes.map(hash => {
        return Array.from(new Uint8Array(hash))
          .map(b => b.toString(16).padStart(2, ''))
          .join('');
      })
    );
    newhashes = [];
    bonus = '';
    console.log(
      'in loop hashes.length is',
      oldhashes.length,
      rootHash,
      oldhashes
    );
  }
  const lastHash = toHexString(new Uint8Array(oldhashes[0]));
  console.log('before return comparison', rootHash, lastHash);
  if (lastHash === rootHash) {
    return {
      valid: true,
    };
  }
  return {
    valid: false,
    reason: 'ROOT_HASH_VERFIY_FAIL_IN_PAGE',
  };
}

async function validateMetaCompanyManifest(rootHash, otherHashes, leaves) {
  // merge all the hashes into one
  const megaHash = JSON.stringify(leaves);
  // hash it
  const encoder = new TextEncoder();
  const encodedMegaHash = encoder.encode(megaHash);
  const jsHashArray = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', encodedMegaHash))
  );
  const jsHash = jsHashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  // compare to main and long tail, it should match one
  // then hash it with the other
  let combinedHash = '';
  if (jsHash === otherHashes.main || jsHash === otherHashes.longtail) {
    const combinedHashArray = Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          'SHA-256',
          encoder.encode(otherHashes.longtail + otherHashes.main)
        )
      )
    );
    combinedHash = combinedHashArray
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } else {
    return false;
  }

  // ensure result matches root, return.
  console.log('combined hash is ', combinedHash, rootHash);
  return combinedHash === rootHash;
}

function getDebugLog(tabId) {
  let tabDebugList = debugCache.get(tabId);
  return tabDebugList == null ? [] : tabDebugList;
}

export function handleMessages(message, sender, sendResponse) {
  console.log('in handle messages ', message);
  // just check for any of the popup urls
  if (message.popup_help_wa) {
    chrome.tabs.query(
      { active: true, lastFocusedWindow: true },
      function (tabs) {
        const currentHostname = new URL(tabs[0].url).hostname;
        if (currentHostname.includes('whatsapp')) {
          chrome.tabs.create({
            url: message.popup_help_wa,
          });
        } else if (currentHostname.includes('messenger')) {
          chrome.tabs.create({
            url: message.popup_help_msgr,
          });
        } else {
          chrome.tabs.create({
            url: message.popup_help_fb,
          });
        }
      }
    );
    return;
  }
  if (message.type == MESSAGE_TYPE.UPDATE_ICON) {
    updateIcon(message, sender);
    return;
  }

  if (message.type == MESSAGE_TYPE.LOAD_MANIFEST) {
    // validate manifest
    if (
      [ORIGIN_TYPE.FACEBOOK, ORIGIN_TYPE.MESSENGER].includes(message.origin)
    ) {
      validateMetaCompanyManifest(
        message.rootHash,
        message.otherHashes,
        message.leaves
      ).then(valid => {
        console.log('result is ', valid);
        if (valid) {
          let origin = manifestCache.get(message.origin);
          if (origin == null) {
            origin = new Map();
            manifestCache.set(message.origin, origin);
          }
          // roll through the existing manifests and remove expired ones
          if (ORIGIN_TIMEOUT[message.origin] > 0) {
            for (let [key, manif] of origin.entries()) {
              if (manif.start + ORIGIN_TIMEOUT[message.origin] < Date.now()) {
                origin.delete(key);
              }
            }
          }

          let manifest = origin.get(message.version);
          if (!manifest) {
            manifest = {
              leaves: [],
              root: message.rootHash,
              start: Date.now(),
            };
            origin.set(message.version, manifest);
          }
          message.leaves.forEach(leaf => {
            if (!manifest.leaves.includes(leaf)) {
              manifest.leaves.push(leaf);
            }
          });
          sendResponse({ valid: true });
        } else {
          sendResponse({ valid: false });
        }
      });
    } else {
      const slicedHash = message.rootHash.slice(2);
      const slicedLeaves = message.leaves.map(leaf => {
        return leaf.slice(2);
      });
      validateManifest(
        slicedHash,
        slicedLeaves,
        ORIGIN_HOST[message.origin],
        message.version,
        message.workaround
      ).then(validationResult => {
        if (validationResult.valid) {
          // store manifest to subsequently validate JS
          let origin = manifestCache.get(message.origin);
          if (origin == null) {
            origin = new Map();
            manifestCache.set(message.origin, origin);
          }
          // roll through the existing manifests and remove expired ones
          if (ORIGIN_TIMEOUT[message.origin] > 0) {
            for (let [key, manif] of origin.entries()) {
              if (manif.start + ORIGIN_TIMEOUT[message.origin] < Date.now()) {
                origin.delete(key);
              }
            }
          }
          console.log('result is ', validationResult.valid);
          origin.set(message.version, {
            leaves: slicedLeaves,
            root: slicedHash,
            start: Date.now(),
          });
          sendResponse({ valid: true });
        } else {
          sendResponse(validationResult);
        }
      });
    }
    return true;
  }

  if (message.type == MESSAGE_TYPE.RAW_JS) {
    const origin = manifestCache.get(message.origin);
    if (!origin) {
      addDebugLog(
        sender.tab.id,
        'Error: RAW_JS had no matching origin ' + message.origin
      );
      sendResponse({ valid: false, reason: 'no matching origin' });
      return;
    }
    const manifestObj = origin.get(message.version);
    const manifest = manifestObj && manifestObj.leaves;
    if (!manifest) {
      addDebugLog(
        sender.tab.id,
        'Error: JS with SRC had no matching manifest. origin: ' +
          message.origin +
          ' version: ' +
          message.version
      );
      sendResponse({ valid: false, reason: 'no matching manifest' });
      return;
    }

    // fetch the src
    const encoder = new TextEncoder();
    const encodedJS = encoder.encode(message.rawjs);
    // hash the src
    crypto.subtle.digest('SHA-256', encodedJS).then(jsHashBuffer => {
      const jsHashArray = Array.from(new Uint8Array(jsHashBuffer));
      const jsHash = jsHashArray
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      if (manifestObj.leaves.includes(jsHash)) {
        sendResponse({ valid: true });
      } else {
        console.log('generate hash is ', jsHash);
        addDebugLog(
          sender.tab.id,
          'Error: hash does not match ' +
            message.origin +
            ', ' +
            message.version +
            ', unmatched JS is ' +
            message.rawjs.substring(0, 500)
        );
        sendResponse({
          valid: false,
          hash: jsHash,
          reason:
            'Error: hash does not match ' +
            message.origin +
            ', ' +
            message.version +
            ', unmatched JS is ' +
            message.rawjs,
        });
      }
    });
    return true;
  }

  if (message.type == MESSAGE_TYPE.DEBUG) {
    addDebugLog(sender.tab.id, message.log);
    return;
  }

  if (message.type == MESSAGE_TYPE.GET_DEBUG) {
    const debuglist = getDebugLog(message.tabId);
    console.log('debug list is ', message.tabId, debuglist);
    sendResponse({ valid: true, debugList: debuglist });
    return;
  }

  if (message.type === MESSAGE_TYPE.UPDATE_STATE) {
    updateContentScriptState(sender, message.state);
    sendResponse({ success: true });
    return;
  }

  if (message.type === MESSAGE_TYPE.CONTENT_SCRIPT_START) {
    recordContentScriptStart(sender);
    sendResponse({ success: true });
    return;
  }
}
chrome.runtime.onMessage.addListener(handleMessages);
const srcFilters = { urls: ['<all_urls>'] };
chrome.webRequest.onResponseStarted.addListener(
  src => {
    if (
      src.type === 'script' &&
      !src.fromCache &&
      src.url.indexOf('chrome-extension://') === 0 &&
      src.url.indexOf('moz-extension://') === 0
    ) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { greeting: 'nocacheHeaderFound' });
      });
    }
  },
  srcFilters,
  []
);
chrome.tabs.onRemoved.addListener(tabId => {
  if (debugCache.has(tabId)) {
    debugCache.delete(tabId);
  }
});
