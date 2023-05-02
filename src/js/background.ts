/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {MessageType, Origin} from './config';
import {MESSAGE_TYPE, ORIGIN_HOST, ORIGIN_TIMEOUT, ORIGIN_TYPE} from './config';

import {
  recordContentScriptStart,
  updateContentScriptState,
} from './background/tab_state_tracker/tabStateTracker';
import {
  addDebugLog,
  getDebugLog,
  setupDebugLogListener,
} from './background/debugUtils';
import {setupCSPListener} from './background/setupCSPListener';
import {validateMetaCompanyManifest} from './background/validateMetaCompanyManifest';
import {validateManifest} from './background/validateManifest';

const manifestCache = new Map<Origin, Map<string, Manifest>>();
const cspHeaders = new Map<number, string | undefined>();
const cspReportHeaders = new Map<number, string | undefined>();

type Manifest = {
  root: string;
  start: number;
  leaves: Array<string>;
};
type MessagePayload = {
  type: MessageType;
  [key: string]: any;
};
type Response = {
  valid?: boolean;
  success?: boolean;
  debugList?: Array<string>;
  reason?: string;
  hash?: string;
  cspHeader?: string;
  cspReportHeader?: string;
};

function handleMessages(
  message: MessagePayload,
  sender: chrome.runtime.MessageSender,
  sendResponse: (_: Response) => void,
): void | boolean {
  console.log('in handle messages ', message);

  if (message.type == MESSAGE_TYPE.LOAD_MANIFEST) {
    // validate manifest
    if (
      [ORIGIN_TYPE.FACEBOOK, ORIGIN_TYPE.MESSENGER].includes(message.origin)
    ) {
      validateMetaCompanyManifest(
        message.rootHash,
        message.otherHashes,
        message.leaves,
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
            for (const [key, manif] of origin.entries()) {
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
          sendResponse({valid: true});
        } else {
          sendResponse({valid: false});
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
        message.workaround,
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
            for (const [key, manif] of origin.entries()) {
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
          sendResponse({valid: true});
        } else {
          sendResponse(validationResult);
        }
      });
    }
    return true;
  } else if (message.type == MESSAGE_TYPE.RAW_JS) {
    const origin = manifestCache.get(message.origin);
    if (!origin) {
      addDebugLog(
        sender.tab.id,
        'Error: RAW_JS had no matching origin ' + message.origin,
      );
      sendResponse({valid: false, reason: 'no matching origin'});
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
          message.version,
      );
      sendResponse({valid: false, reason: 'no matching manifest'});
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
        sendResponse({valid: true});
      } else {
        console.log('generate hash is ', jsHash);
        addDebugLog(
          sender.tab.id,
          'Error: hash does not match ' +
            message.origin +
            ', ' +
            message.version +
            ', unmatched JS is ' +
            message.rawjs.substring(0, 500),
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
  } else if (message.type == MESSAGE_TYPE.DEBUG) {
    addDebugLog(sender.tab.id, message.log);
  } else if (message.type == MESSAGE_TYPE.GET_DEBUG) {
    const debuglist = getDebugLog(message.tabId);
    console.log('debug list is ', message.tabId, debuglist);
    sendResponse({valid: true, debugList: debuglist});
  } else if (message.type === MESSAGE_TYPE.UPDATE_STATE) {
    updateContentScriptState(sender, message.state, message.origin);
    sendResponse({success: true});
  } else if (message.type === MESSAGE_TYPE.CONTENT_SCRIPT_START) {
    recordContentScriptStart(sender, message.origin);
    sendResponse({
      success: true,
      cspHeader: cspHeaders.get(sender.tab.id),
      cspReportHeader: cspReportHeaders.get(sender.tab.id),
    });
  }
}

chrome.runtime.onMessage.addListener(handleMessages);

setupCSPListener(cspHeaders, cspReportHeaders);
setupDebugLogListener();

// Emulate PageActions
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.runtime.getManifest().manifest_version >= 3) {
    chrome.action.disable();
  }
});

chrome.webRequest.onResponseStarted.addListener(
  src => {
    if (
      src.type === 'script' &&
      !src.fromCache &&
      src.url.indexOf('chrome-extension://') === 0 &&
      src.url.indexOf('moz-extension://') === 0
    ) {
      chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {greeting: 'nocacheHeaderFound'});
      });
    }
  },
  {urls: ['<all_urls>']},
  [],
);
