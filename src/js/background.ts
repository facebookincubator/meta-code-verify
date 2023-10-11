/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {Origin, STATES} from './config';
import {MESSAGE_TYPE, ORIGIN_HOST, ORIGIN_TIMEOUT} from './config';

import {
  recordContentScriptStart,
  updateContentScriptState,
} from './background/tab_state_tracker/tabStateTracker';
import setupCSPListener from './background/setupCSPListener';
import setUpWebRequestsListener from './background/setUpWebRequestsListener';
import {validateMetaCompanyManifest} from './background/validateMetaCompanyManifest';
import {validateManifest} from './background/validateManifest';
import {MessagePayload, MessageResponse} from './shared/MessageTypes';

const MANIFEST_CACHE = new Map<Origin, Map<string, Manifest>>();

// TabID -> FrameID -> Array<CSP Header Values>
// There might be multiple CSP policy headers per response
export type CSPHeaderMap = Map<number, Map<number, Array<string>>>;
const CSP_HEADERS: CSPHeaderMap = new Map();
const CSP_REPORT_HEADERS: CSPHeaderMap = new Map();

// Keeps track of scripts `fetch`-ed by the extension to ensure they are all
// resolved from browser cache
const CACHED_SCRIPTS_URLS = new Map<number, Set<string>>();

type Manifest = {
  root: string;
  start: number;
  leaves: Array<string>;
};

function getManifestMapForOrigin(origin: Origin): Map<string, Manifest> {
  // store manifest to subsequently validate JS
  let manifestMap = MANIFEST_CACHE.get(origin);
  if (manifestMap == null) {
    manifestMap = new Map();
    MANIFEST_CACHE.set(origin, manifestMap);
  }
  // roll through the existing manifests and remove expired ones
  if (ORIGIN_TIMEOUT[origin] > 0) {
    for (const [key, manif] of manifestMap.entries()) {
      if (manif.start + ORIGIN_TIMEOUT[origin] < Date.now()) {
        manifestMap.delete(key);
      }
    }
  }
  return manifestMap;
}

function logReceivedMessage(
  message: MessagePayload,
  sender: chrome.runtime.MessageSender,
): void {
  let logger = console.log;
  switch (message.type) {
    case MESSAGE_TYPE.UPDATE_STATE:
      if (message.state === STATES.INVALID) {
        logger = console.error;
      } else if (message.state === STATES.PROCESSING) {
        logger = null;
      }
      break;
    case MESSAGE_TYPE.DEBUG:
      logger = console.debug;
      break;
  }
  logger?.(`handleMessages from tab:${sender.tab.id}`, message);
}

function handleMessages(
  message: MessagePayload,
  sender: chrome.runtime.MessageSender,
  sendResponse: (_: MessageResponse) => void,
): void | boolean {
  logReceivedMessage(message, sender);
  if (message.type == MESSAGE_TYPE.LOAD_MANIFEST) {
    // validate manifest
    if (message.useCompanyManifest) {
      validateMetaCompanyManifest(
        message.rootHash,
        message.otherHashes,
        message.leaves,
        ORIGIN_HOST[message.origin],
        message.version,
      ).then(validationResult => {
        if (validationResult.valid) {
          const manifestMap = getManifestMapForOrigin(message.origin);
          let manifest = manifestMap.get(message.version);
          if (!manifest) {
            manifest = {
              leaves: [],
              root: message.rootHash,
              start: Date.now(),
            };
            manifestMap.set(message.version, manifest);
          }
          message.leaves.forEach(leaf => {
            if (!manifest.leaves.includes(leaf)) {
              manifest.leaves.push(leaf);
            }
          });
          sendResponse({valid: true});
        } else {
          sendResponse(validationResult);
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
          const manifestMap = getManifestMapForOrigin(message.origin);
          manifestMap.set(message.version, {
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
    const origin = MANIFEST_CACHE.get(message.origin);
    if (!origin) {
      sendResponse({valid: false, reason: 'no matching origin'});
      return;
    }
    const manifestObj = origin.get(message.version);
    const manifest = manifestObj && manifestObj.leaves;
    if (!manifest) {
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
  } else if (message.type === MESSAGE_TYPE.UPDATE_STATE) {
    updateContentScriptState(sender, message.state, message.origin);
    sendResponse({success: true});
  } else if (message.type === MESSAGE_TYPE.CONTENT_SCRIPT_START) {
    recordContentScriptStart(sender, message.origin);
    sendResponse({
      success: true,
      cspHeaders: CSP_HEADERS?.get(sender.tab.id)?.get(sender.frameId),
      cspReportHeaders: CSP_REPORT_HEADERS?.get(sender.tab.id)?.get(
        sender.frameId,
      ),
    });
  } else if (message.type === MESSAGE_TYPE.UPDATED_CACHED_SCRIPT_URLS) {
    if (!CACHED_SCRIPTS_URLS.has(sender.tab.id)) {
      CACHED_SCRIPTS_URLS.set(sender.tab.id, new Set());
    }
    CACHED_SCRIPTS_URLS.get(sender.tab.id).add(message.url);
    sendResponse({success: true});
    return true;
  }
}

chrome.runtime.onMessage.addListener(handleMessages);

setupCSPListener(CSP_HEADERS, CSP_REPORT_HEADERS);
setUpWebRequestsListener(CACHED_SCRIPTS_URLS);

// Emulate PageActions
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.runtime.getManifest().manifest_version >= 3) {
    chrome.action.disable();
  }
});
