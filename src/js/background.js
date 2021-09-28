import { MESSAGE_TYPE, ORIGIN_ENDPOINT } from './config.js';
const manifestCache = new Map();

const updateIcon = (message, sender) => {
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
};

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
      const manifest = origin.get(message.version);
      if (manifest) {
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

    // on cache miss load missing manifest
    const endpoint = ORIGIN_ENDPOINT[message.origin] + '/' + message.version;
    // TODO: Add error handling here
    fetch(endpoint, { METHOD: 'GET' })
      .then(response => response.json())
      .then(json => {
        origin.set(message.version, json[message.version]);
        sendResponse({ valid: true });
      })
      .catch(error => {
        chrome.runtime.sendMessage({
          debugMessage:
            'Error fetching manifest, version ' +
            message.version +
            ' error ' +
            JSON.stringify(error).substring(0, 500),
        });
        sendResponse({ valid: false });
      });
    return true;
  }

  if (message.type == MESSAGE_TYPE.JS_WITH_SRC) {
    const origin = manifestCache.get(message.origin);
    if (!origin) {
      chrome.runtime.sendMessage({
        debugMessage:
          'Error: JS with SRC had no matching origin ' + message.origin,
      });
      sendResponse({ valid: false, reason: 'no matching origin' });
      return;
    }
    const manifest = origin.get(message.version);
    if (!manifest) {
      chrome.runtime.sendMessage({
        debugMessage:
          'Error: JS with SRC had no matching manifest. origin: ' +
          message.origin +
          ' version: ' +
          message.version,
      });
      sendResponse({ valid: false, reason: 'no matching manifest' });
      return;
    }
    const jsPath = new URL(message.src).pathname;
    const hashToMatch = manifest[jsPath];
    if (!hashToMatch) {
      chrome.runtime.sendMessage({
        debugMessage:
          'Error: hash does not match ' +
          message.origin +
          ', ' +
          message.version +
          ', unmatched JS is ' +
          message.src,
      });
      sendResponse({ valid: false, reason: 'no matching hash' });
      return;
    }

    // fetch the src
    fetch(message.src, { METHOD: 'GET' })
      .then(response => response.text())
      .then(jsText => {
        // hash the src
        const encoder = new TextEncoder();
        const encodedJS = encoder.encode(jsText);
        return crypto.subtle.digest('SHA-384', encodedJS);
      })
      .then(jsHashBuffer => {
        const jsHashArray = Array.from(new Uint8Array(jsHashBuffer));
        const jsHash = jsHashArray
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        // compare hashes
        sendResponse({ valid: jsHash === hashToMatch });
      })
      .catch(error => {
        chrome.runtime.sendMessage({
          debugMessage:
            'Error: Processing JS with SRC ' +
            message.origin +
            ', ' +
            message.version +
            ' problematic JS is ' +
            message.src +
            'error is ' +
            JSON.stringify(error).substring(0, 500),
        });
      });
    return true;
  }

  if (message.type == MESSAGE_TYPE.RAW_JS) {
    const origin = manifestCache.get(message.origin);
    if (!origin) {
      chrome.runtime.sendMessage({
        debugMessage: 'Error: RAW_JS had no matching origin ' + message.origin,
      });
      sendResponse({ valid: false, reason: 'no matching origin' });
      return;
    }
    const manifest = origin.get(message.version);
    if (!manifest) {
      chrome.runtime.sendMessage({
        debugMessage:
          'Error: JS with SRC had no matching manifest. origin: ' +
          message.origin +
          ' version: ' +
          message.version,
      });
      sendResponse({ valid: false, reason: 'no matching manifest' });
      return;
    }

    // fetch the src
    const encoder = new TextEncoder();
    const encodedJS = encoder.encode(message.rawjs);
    // hash the src
    crypto.subtle.digest('SHA-384', encodedJS).then(jsHashBuffer => {
      const jsHashArray = Array.from(new Uint8Array(jsHashBuffer));
      const jsHash = jsHashArray
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      let hashToMatch = manifest[message.lookupKey];
      if (hashToMatch == null) {
        hashToMatch = manifest['inline-js-' + jsHash];
      }

      if (!hashToMatch) {
        chrome.runtime.sendMessage({
          debugMessage:
            'Error: hash does not match ' +
            message.origin +
            ', ' +
            message.version +
            ', unmatched JS is ' +
            message.rawjs.substring(0, 500),
        });
        sendResponse({ valid: false, reason: 'no matching hash' });
        return;
      }
      if (jsHash === hashToMatch) {
        sendResponse({ valid: true });
      } else {
        chrome.runtime.sendMessage({
          debugMessage:
            'Error: hash does not match ' +
            message.origin +
            ', ' +
            message.version +
            ', unmatched JS is ' +
            message.rawjs.substring(0, 500),
        });
        sendResponse({ valid: false, reason: 'no matching hash' });
      }
    });
    return true;
  }
}

chrome.runtime.onMessage.addListener(handleMessages);
