import { MESSAGE_TYPE, ORIGIN_TIMEOUT, ORIGIN_TYPE } from './config.js';
const manifestCache = new Map();
const debugCache = new Map();

function updateIcon(message, sender) {
  console.log('background messages are ', message);
  chrome.pageAction.setIcon({ tabId: sender.tab.id, path: message.icon.badge });
  const popupMessage = {
    tabId: sender.tab.id,
    popup: message.icon.popup,
  };
  chrome.pageAction.setPopup(popupMessage);
  const messageForPopup = {
    popup: message.icon.popup,
    senderUrl: sender.tab.url,
    tabId: sender.tab.id,
  };
  chrome.runtime.sendMessage(messageForPopup);
  chrome.pageAction.show(sender.tab.id);
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

async function validateManifest(rootHash, leaves) {
  console.log('initial leaves are ', leaves);
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
  return lastHash === rootHash;
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
  if (message.type == MESSAGE_TYPE.UPDATE_ICON) {
    updateIcon(message, sender);
    return;
  }

  if (message.type == MESSAGE_TYPE.LOAD_MANIFEST) {
    // check manifest cache
    let origin = manifestCache.get(message.origin);
    if (origin) {
      const manifestObj = origin.get(message.version);
      const manifest = manifestObj && manifestObj.leaves;
      if (manifest && message.otherType === '') {
        // on cache hit sendResponse
        sendResponse({ valid: true });
        return;
      }
    }
    // populate origin if not there
    if (origin == null) {
      origin = new Map();
      manifestCache.set(message.origin, origin);
    }

    // roll through the existing manifests and remove expired ones
    if (ORIGIN_TIMEOUT[message.origin] > 0) {
      for (let [key, manif] of origin.entries()) {
        if (manif.start + ORIGIN_TIMEOUT[message.origin] > Date.now()) {
          origin.delete(key);
        }
      }
    }

    // validate manifest
    if ([ORIGIN_TYPE.FACEBOOK].includes(message.origin)) {
      validateMetaCompanyManifest(
        message.rootHash,
        message.otherHashes,
        message.leaves
      ).then();
    } else {
      const slicedHash = message.rootHash.slice(2);
      const slicedLeaves = message.leaves.map(leaf => {
        return leaf.slice(2);
      });
      validateManifest(slicedHash, slicedLeaves).then(valid => {
        if (valid) {
          // store manifest to subsequently validate JS
          console.log('result is ', valid);
          origin.set(message.version, {
            leaves: slicedLeaves,
            root: slicedHash,
            start: Date.now(),
          });
          sendResponse({ valid: true });
        } else {
          sendResponse({ valid: false });
        }
      });
    }
    return true;
  }

  if (message.type == MESSAGE_TYPE.JS_WITH_SRC) {
    // exclude known extension scripts from analysis
    if (
      message.src.indexOf('chrome-extension://') === 0 ||
      message.src.indexOf('moz-extension://') === 0
    ) {
      addDebugLog(
        sender.tab.id,
        'Warning: User installed extension inserted script ' + message.src
      );
      sendResponse({
        valid: true,
        reason: 'User installed extension has inserted script',
      });
      return;
    }

    const origin = manifestCache.get(message.origin);
    if (!origin) {
      addDebugLog(
        sender.tab.id,
        'Error: JS with SRC had no matching origin ' + message.origin
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
    fetch(message.src, { METHOD: 'GET' })
      .then(response => response.text())
      .then(jsText => {
        // hash the src
        const encoder = new TextEncoder();
        const encodedJS = encoder.encode(jsText);
        return crypto.subtle.digest('SHA-256', encodedJS);
      })
      .then(jsHashBuffer => {
        const jsHashArray = Array.from(new Uint8Array(jsHashBuffer));
        const jsHash = jsHashArray
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        // compare hashes
        sendResponse({ valid: manifestObj.leaves.includes(jsHash) });
      })
      .catch(error => {
        addDebugLog(
          sender.tab.id,
          'Error: Processing JS with SRC ' +
            message.origin +
            ', ' +
            message.version +
            ' problematic JS is ' +
            message.src +
            'error is ' +
            JSON.stringify(error).substring(0, 500)
        );
      });
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

      console.log('generate hash is ', jsHash);
      if (manifestObj.leaves.includes(jsHash)) {
        sendResponse({ valid: true });
      } else {
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
}

chrome.runtime.onMessage.addListener(handleMessages);
chrome.tabs.onRemoved.addListener(tabId => {
  if (debugCache.has(tabId)) {
    debugCache.delete(tabId);
  }
});
