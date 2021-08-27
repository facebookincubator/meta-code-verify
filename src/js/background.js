import { MESSAGE_TYPE, ORIGIN_ENDPOINT } from "./config.js";
const manifestCache = new Map();

chrome.runtime.onMessage.addListener(function (message, _sender, sendResponse) {
  // get message type
  console.log("I got the message from detect", message);

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
    const endpoint = ORIGIN_ENDPOINT[message.origin] + "/" + message.version;
    // TODO: Add error handling here
    fetch(endpoint, { METHOD: "GET" })
      .then(response => response.json())
      .then(json => {
        origin.set(message.version, json[message.version]);
        sendResponse({ valid: true });
      });
    return true;
  }

  if (message.type == MESSAGE_TYPE.JS_WITH_SRC) {
    console.log("js with source message is ", message);
    const origin = manifestCache.get(message.origin);
    if (!origin) {
      sendResponse({ valid: false, reason: "no matching origin" });
      return;
    }
    const manifest = origin.get(message.version);
    if (!manifest) {
      sendResponse({ valid: false, reason: "no matching manifest" });
      return;
    }
    const jsPath = new URL(message.src).pathname;
    const hashToMatch = manifest[jsPath];
    console.log("JS_WITH_SRC values to check are ", jsPath, hashToMatch);
    if (!hashToMatch) {
      sendResponse({ valid: false, reason: "no matching hash" });
      return;
    }

    // fetch the src
    fetch(message.src, { METHOD: "GET" })
      .then(response => response.text())
      .then(jsText => {
        // hash the src
        const encoder = new TextEncoder();
        const encodedJS = encoder.encode(jsText);
        return crypto.subtle.digest("SHA-384", encodedJS);
      })
      .then(jsHashBuffer => {
        const jsHashArray = Array.from(new Uint8Array(jsHashBuffer));
        const jsHash = jsHashArray
          .map(b => b.toString(16).padStart(2, "0"))
          .join("");
        console.log("js hash is :" + jsHash + ":*****:" + hashToMatch + ":");
        // compare hashes
        if (jsHash === hashToMatch) {
          sendResponse({ valid: true });
        } else {
          sendResponse({ valid: false });
          if (jsHash != "2424") {
            console.log("blah");
          }
        }
      });
    return true;
  }

  if (message.type == MESSAGE_TYPE.RAW_JS) {
    console.log("raw js message is ", message);
    const origin = manifestCache.get(message.origin);
    if (!origin) {
      sendResponse({ valid: false, reason: "no matching origin" });
      return;
    }
    const manifest = origin.get(message.version);
    if (!manifest) {
      sendResponse({ valid: false, reason: "no matching manifest" });
      return;
    }

    // fetch the src
    const encoder = new TextEncoder();
    const encodedJS = encoder.encode(message.rawjs);
    // hash the src
    crypto.subtle.digest("SHA-384", encodedJS).then(jsHashBuffer => {
      const jsHashArray = Array.from(new Uint8Array(jsHashBuffer));
      const jsHash = jsHashArray
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

      // compare hashes
      const hashToMatch = manifest["inline-js-" + jsHash];
      console.log("RAW_JS values to check are ", jsHash, hashToMatch);
      if (!hashToMatch) {
        sendResponse({ valid: false, reason: "no matching hash" });
      }
      if (jsHash === hashToMatch) {
        sendResponse({ valid: true });
      } else {
        sendResponse({ valid: false, reason: "no matching hash" });
      }
    });
    return true;
  }
  sendResponse({ stuff: "BZZZZZT! WRONG ANSWER!!!!" });
});
