/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {DYNAMIC_STRING_MARKER, Origin, STATES} from './config';
import {MESSAGE_TYPE, ORIGIN_HOST, ORIGIN_TIMEOUT} from './config';

import {
  recordContentScriptStart,
  updateContentScriptState,
} from './background/tab_state_tracker/tabStateTracker';
import setupCSPListener from './background/setupCSPListener';
import setUpWebRequestsListener from './background/setUpWebRequestsListener';
import {validateMetaCompanyManifest} from './background/validateMetaCompanyManifest';
import {validateSender} from './background/validateSender';
import {removeDynamicStrings} from './background/removeDynamicStrings';
import {MessagePayload, MessageResponse} from './shared/MessageTypes';
import {setOrUpdateSetInMap} from './shared/nestedDataHelpers';

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
  // store manifest to subsequently validate JS/CSS
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
        logger = () => {};
      }
      break;
    case MESSAGE_TYPE.DEBUG:
      logger = console.debug;
      break;
  }
  if (sender.tab) {
    logger(`handleMessages from tab:${sender.tab.id}`, message);
  } else {
    logger(`handleMessages from unknown tab`, message);
  }
}

function handleMessages(
  message: MessagePayload,
  sender: chrome.runtime.MessageSender,
  sendResponse: (_: MessageResponse) => void,
): void | boolean {
  logReceivedMessage(message, sender);
  const validSender = validateSender(sender);

  // There are niche reasons we might receive messages from an unexpected
  // sender (see validateSender method for details). Our own messages should
  // never fall into this category, so we can simply ignore them.
  if (!validSender) {
    return;
  }

  switch (message.type) {
    // Log only
    case MESSAGE_TYPE.DEBUG:
      return;

    // Log only
    case MESSAGE_TYPE.STATE_UPDATED:
      return;

    case MESSAGE_TYPE.LOAD_COMPANY_MANIFEST: {
      validateMetaCompanyManifest(
        message.rootHash,
        message.otherHashes,
        message.leaves,
        ORIGIN_HOST[message.origin],
        message.version,
      ).then(validationResult => {
        if (validationResult.valid) {
          const manifestMap = getManifestMapForOrigin(message.origin);
          const manifest = manifestMap.get(message.version) ?? {
            leaves: [],
            root: message.rootHash,
            start: Date.now(),
          };
          if (!manifestMap.has(message.version)) {
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

      // Indicates that the message will send an async response.
      return true;
    }

    case MESSAGE_TYPE.RAW_SRC: {
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

      if (message.pkgRaw.includes(DYNAMIC_STRING_MARKER)) {
        try {
          message.pkgRaw = removeDynamicStrings(message.pkgRaw);
        } catch (e) {
          sendResponse({valid: false, reason: 'failed parsing AST'});
          return;
        }
      }

      // fetch the src
      const encoder = new TextEncoder();
      const encodedSrc = encoder.encode(message.pkgRaw);
      // hash the src
      crypto.subtle.digest('SHA-256', encodedSrc).then(hashBuffer => {
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hash = hashArray
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        if (manifestObj.leaves.includes(hash)) {
          sendResponse({valid: true, hash: hash});
        } else {
          sendResponse({
            valid: false,
            hash: hash,
            reason:
              'Error: hash does not match ' +
              message.origin +
              ', ' +
              message.version +
              ', unmatched SRC is ' +
              message.pkgRaw,
          });
        }
      });

      // Indicates that the message will send an async response.
      return true;
    }

    case MESSAGE_TYPE.UPDATE_STATE: {
      updateContentScriptState(validSender, message.state, message.origin);
      sendResponse({success: true});
      return;
    }

    case MESSAGE_TYPE.CONTENT_SCRIPT_START: {
      recordContentScriptStart(validSender, message.origin);

      sendResponse({
        success: true,
        cspHeaders: CSP_HEADERS.get(validSender.tab.id)?.get(
          validSender.frameId,
        ),
        cspReportHeaders: CSP_REPORT_HEADERS?.get(validSender.tab.id)?.get(
          validSender.frameId,
        ),
      });

      return;
    }

    case MESSAGE_TYPE.UPDATED_CACHED_SCRIPT_URLS: {
      setOrUpdateSetInMap(CACHED_SCRIPTS_URLS, validSender.tab.id, message.url);
      sendResponse({success: true});

      return true;
    }

    default: {
      // See: https://www.typescriptlang.org/docs/handbook/2/narrowing.html#exhaustiveness-checking
      const _exhaustiveCheck: never = message;
      return _exhaustiveCheck;
    }
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
