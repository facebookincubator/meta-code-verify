/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  KNOWN_EXTENSION_HASHES,
  MESSAGE_TYPE,
  DOWNLOAD_JS_ENABLED,
  STATES,
  Origin,
  ORIGIN_TYPE,
} from './config';

import {
  checkDocumentCSPHeaders,
  getAllowedWorkerCSPs,
} from './content/checkDocumentCSPHeaders';
import downloadJSArchive from './content/downloadJSArchive';
import alertBackgroundOfImminentFetch from './content/alertBackgroundOfImminentFetch';
import {
  getCurrentOrigin,
  setCurrentOrigin,
  updateCurrentState,
  invalidateAndThrow,
} from './content/updateCurrentState';
import {sendMessageToBackground} from './shared/sendMessageToBackground';
import {parseFailedJSON} from './content/parseFailedJSON';
import genSourceText from './content/genSourceText';
import isPathnameExcluded from './content/isPathNameExcluded';
import {doesWorkerUrlConformToCSP} from './content/doesWorkerUrlConformToCSP';
import {checkWorkerEndpointCSP} from './content/checkWorkerEndpointCSP';
import {MessagePayload} from './shared/MessageTypes';
import {pushToOrCreateArrayInMap} from './shared/nestedDataHelpers';

type ContentScriptConfig = {
  checkLoggedInFromCookie: boolean;
  enforceCSPHeaders: boolean;
  excludedPathnames: Array<RegExp>;
  longTailIsLoadedConditionally: boolean;
  scriptsShouldHaveManifestProp: boolean;
  useCompanyManifest: boolean;
};

let originConfig: ContentScriptConfig = {
  checkLoggedInFromCookie: false,
  enforceCSPHeaders: false,
  excludedPathnames: [],
  longTailIsLoadedConditionally: false,
  scriptsShouldHaveManifestProp: false,
  useCompanyManifest: false,
};

const SOURCE_SCRIPTS = new Map();
/**
 * using an array of maps, as we're using the same key for inline scripts
 * this will eventually be removed, once inline scripts are removed from the
 * page load
 * */
const INLINE_SCRIPTS: Array<Map<string, string>> = [];

export const UNKNOWN = 'UNKNOWN';

// Filter types
const MANIFEST_NOT_LOADED = 'MANIFEST_NOT_LOADED';
const BOTH_MANIFESTS_LOADED = 'BOTH_MANIFESTS_LOADED';
const MANIFEST_LOADED = 'MANIFEST_LOADED';
const ANY_FILTER = 'ANY_FILTER';

const filterTypeByVersion: Map<string, string> = new Map([
  [UNKNOWN, MANIFEST_NOT_LOADED],
]);
export const FOUND_SCRIPTS = new Map<string, Array<ScriptDetails>>([
  [UNKNOWN, []],
]);
const ALL_FOUND_SCRIPT_TAGS = new Set();

type ScriptDetailsWithSrc = {
  filterTypeRequiredToProcess: string;
  src: string;
};
type ScriptDetailsRaw = {
  type: typeof MESSAGE_TYPE.RAW_JS;
  rawjs: string;
  lookupKey: string;
  filterTypeRequiredToProcess: string;
};
type ScriptDetails = ScriptDetailsRaw | ScriptDetailsWithSrc;
let manifestTimeoutID: string | number = '';

export type RawManifestOtherHashes = {
  combined_hash: string;
  longtail: string;
  main: string;
};
type RawManifest = {
  manifest: Array<string>;
  manifest_hashes: RawManifestOtherHashes;
  leaves: Array<string>;
  root: string;
  version: string;
};

function isTopWindow(): boolean {
  return window == window.top;
}
function isSameDomainAsTopWindow(): boolean {
  try {
    // This is inside a try/catch because even attempting to access the `origin`
    // property will throw a SecurityError if the domains don't match.
    return window.location.origin === window.top?.location.origin;
  } catch {
    return false;
  }
}

function handleManifestNode(manifestNode: HTMLScriptElement): void {
  if (manifestNode.getAttribute('type') !== 'application/json') {
    updateCurrentState(STATES.INVALID, 'Manifest script type is invalid');
    return;
  }

  let rawManifest: RawManifest | null = null;
  // Only a document/doctype can have textContent as null
  const manifestNodeTextContent = manifestNode.textContent ?? '';
  try {
    rawManifest = JSON.parse(manifestNodeTextContent);
  } catch (manifestParseError) {
    setTimeout(() => parseFailedJSON({node: manifestNode, retry: 5000}), 20);
    return;
  }

  if (rawManifest == null || typeof rawManifest !== 'object') {
    invalidateAndThrow('Manifest is null');
  }

  let leaves = rawManifest.leaves;
  let filterType: string;
  let roothash = rawManifest.root;
  let version: string;
  let messagePayload: MessagePayload;

  if (originConfig.longTailIsLoadedConditionally) {
    leaves = rawManifest.manifest;
    const otherHashes = rawManifest.manifest_hashes;
    roothash = otherHashes.combined_hash;

    const manifestType = manifestNode.getAttribute('data-manifest-type');
    if (manifestType === null) {
      invalidateAndThrow('manifest is missing `data-manifest-type` prop');
    }

    const maybeManifestRev = manifestNode.getAttribute('data-manifest-rev');
    if (maybeManifestRev === null) {
      invalidateAndThrow('manifest is missing `data-manifest-rev` prop');
    } else {
      version = maybeManifestRev;
    }

    // If this is the first manifest we've found, start processing scripts for
    // that type. If we have encountered a second manifest, we can assume both
    // main and longtail manifests are present.
    if (filterTypeByVersion.has(version)) {
      filterType = BOTH_MANIFESTS_LOADED;
    } else {
      filterType = manifestType;
    }

    messagePayload = {
      type: MESSAGE_TYPE.LOAD_COMPANY_MANIFEST,
      leaves,
      origin: getCurrentOrigin(),
      otherHashes: otherHashes,
      rootHash: roothash,
      workaround: manifestNode.innerHTML,
      version,
    };
  } else {
    // for whatsapp
    version = rawManifest.version;
    filterType = MANIFEST_LOADED;

    messagePayload = {
      type: MESSAGE_TYPE.LOAD_MANIFEST,
      leaves,
      origin: getCurrentOrigin(),
      rootHash: roothash,
      workaround: manifestNode.innerHTML,
      version,
    };
  }

  filterTypeByVersion.set(version, filterType);

  // Initialize this version in FOUND_SCRIPTS if it doesn't already exist.
  const scriptsForVersion = FOUND_SCRIPTS.get(version) ?? [];
  FOUND_SCRIPTS.set(version, scriptsForVersion);

  // Now that we definitely have a version, we can grab any scripts with an
  // unknown version and move them into that version's queue.
  const foundScriptsWithoutVersion = FOUND_SCRIPTS.get(UNKNOWN);
  if (foundScriptsWithoutVersion) {
    scriptsForVersion.push(...foundScriptsWithoutVersion);
    FOUND_SCRIPTS.delete(UNKNOWN);
  }

  sendMessageToBackground(messagePayload, response => {
    // then start processing of it's JS
    if (response.valid) {
      if (manifestTimeoutID !== '') {
        clearTimeout(manifestTimeoutID);
        manifestTimeoutID = '';
      }
      window.setTimeout(() => processFoundJS(version), 0);
    } else {
      if ('UNKNOWN_ENDPOINT_ISSUE' === response.reason) {
        updateCurrentState(STATES.TIMEOUT);
        return;
      }
      updateCurrentState(STATES.INVALID);
    }
  });
}

function handleScriptNode(scriptNode: HTMLScriptElement): void {
  if (originConfig.scriptsShouldHaveManifestProp) {
    const dataBtManifest = scriptNode.getAttribute('data-btmanifest');
    if (dataBtManifest == null) {
      invalidateAndThrow(
        `No data-btmanifest attribute found on script ${scriptNode.src}`,
      );
    }

    // Scripts may contain packages from both main and longtail manifests,
    // e.g. "1009592080_main,1009592080_longtail"
    const [manifest1, manifest2] = dataBtManifest.split(',');

    // If this scripts contains packages from both main and longtail manifests
    // then require both manifests to be loaded before processing this script,
    // otherwise use the single type specified.
    const filterTypeRequiredToProcess = manifest2
      ? BOTH_MANIFESTS_LOADED
      : manifest1.split('_')[1];

    // It is safe to assume a script will not contain packages from different
    // versions, so we can use the first manifest version as the script version.
    const version = manifest1.split('_')[0];

    if (!version) {
      invalidateAndThrow(
        `Unable to parse a valid version from the data-btmanifest property of ${scriptNode.src}`,
      );
    }

    const scriptDetails = {
      src: scriptNode.src,
      filterTypeRequiredToProcess,
    };

    ALL_FOUND_SCRIPT_TAGS.add(scriptNode.src);
    pushToOrCreateArrayInMap(FOUND_SCRIPTS, version, scriptDetails);
  } else {
    let scriptDetails: ScriptDetails;

    if (scriptNode.src !== '') {
      scriptDetails = {
        src: scriptNode.src,
        filterTypeRequiredToProcess: MANIFEST_LOADED,
      };
      ALL_FOUND_SCRIPT_TAGS.add(scriptNode.src);
    } else {
      // no src, access innerHTML for the code
      const hashLookupAttribute =
        // @ts-ignore: This is just sort of hole in the DOM definitions.
        scriptNode.attributes['data-binary-transparency-hash-key'];
      const hashLookupKey = hashLookupAttribute && hashLookupAttribute.value;
      scriptDetails = {
        type: MESSAGE_TYPE.RAW_JS,
        rawjs: scriptNode.innerHTML,
        lookupKey: hashLookupKey,
        filterTypeRequiredToProcess: MANIFEST_LOADED,
      };
    }

    const latestVersionInMap = Array.from(FOUND_SCRIPTS.values()).pop();
    if (latestVersionInMap) {
      latestVersionInMap.push(scriptDetails);
    }
  }

  updateCurrentState(STATES.PROCESSING);
}

export function storeFoundJS(scriptNode: HTMLScriptElement): void {
  if (!isTopWindow() && isSameDomainAsTopWindow()) {
    // this means that content utils is running in an iframe - disable timer and call processFoundJS on manifest processed in top level frame
    clearTimeout(manifestTimeoutID);
    manifestTimeoutID = '';
    FOUND_SCRIPTS.forEach((_val, key) => {
      window.setTimeout(() => processFoundJS(key), 0);
    });
  }

  // check if it's the manifest node
  if (
    (isTopWindow() || !isSameDomainAsTopWindow()) &&
    (scriptNode.id === 'binary-transparency-manifest' ||
      scriptNode.getAttribute('name') === 'binary-transparency-manifest')
  ) {
    handleManifestNode(scriptNode);
  }

  // Only a document/doctype can have textContent as null
  const nodeTextContent = scriptNode.textContent ?? '';
  if (scriptNode.getAttribute('type') === 'application/json') {
    try {
      JSON.parse(nodeTextContent);
    } catch (parseError) {
      setTimeout(() => parseFailedJSON({node: scriptNode, retry: 1500}), 20);
    }
    return;
  }

  if (
    scriptNode.src != null &&
    scriptNode.src !== '' &&
    scriptNode.src.indexOf('blob:') === 0
  ) {
    // TODO: try to process the blob. For now, flag as warning.
    updateCurrentState(STATES.INVALID, 'blob: src');
    return;
  }

  if (scriptNode.src !== '' || scriptNode.innerHTML !== '') {
    handleScriptNode(scriptNode);
  }
}

export function hasInvalidScripts(scriptNodeMaybe: Node): void {
  // if not an HTMLElement ignore it!
  if (scriptNodeMaybe.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  if (scriptNodeMaybe.nodeName.toLowerCase() === 'script') {
    storeFoundJS(scriptNodeMaybe as HTMLScriptElement);
  } else if (scriptNodeMaybe.childNodes.length > 0) {
    scriptNodeMaybe.childNodes.forEach(childNode => {
      hasInvalidScripts(childNode);
    });
  }
}

export const scanForScripts = (): void => {
  const allElements = document.getElementsByTagName('*');
  Array.from(allElements).forEach(element => {
    // next check for existing script elements and if they're violating
    if (element.nodeName.toLowerCase() === 'script') {
      storeFoundJS(element as HTMLScriptElement);
    }
  });

  try {
    // track any new scripts that get loaded in
    const scriptMutationObserver = new MutationObserver(mutationsList => {
      mutationsList.forEach(mutation => {
        if (mutation.type === 'childList') {
          Array.from(mutation.addedNodes).forEach(checkScript => {
            // Code within a script tag has changed
            if (
              checkScript.nodeType === Node.TEXT_NODE &&
              mutation.target.nodeName.toLocaleLowerCase() === 'script'
            ) {
              hasInvalidScripts(mutation.target);
            } else {
              hasInvalidScripts(checkScript);
            }
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
    updateCurrentState(STATES.INVALID, 'unknown');
  }
};

async function processJSWithSrc(
  script: ScriptDetailsWithSrc,
  version: string,
): Promise<{
  valid: boolean;
  type?: unknown;
}> {
  // fetch the script from page context, not the extension context.
  try {
    await alertBackgroundOfImminentFetch(script.src);
    const sourceResponse = await fetch(script.src, {
      method: 'GET',
    });
    if (DOWNLOAD_JS_ENABLED) {
      const fileNameArr = script.src.split('/');
      const fileName = fileNameArr[fileNameArr.length - 1].split('?')[0];
      const responseBody = sourceResponse.clone().body;
      if (!responseBody) {
        throw new Error('Response for fetched script has no body');
      }
      SOURCE_SCRIPTS.set(
        fileName,
        responseBody.pipeThrough(new window.CompressionStream('gzip')),
      );
    }
    const sourceText = await genSourceText(sourceResponse);
    // split package up if necessary
    const packages = sourceText.split('/*FB_PKG_DELIM*/\n');
    const packagePromises = packages.map(jsPackage => {
      return new Promise((resolve, reject) => {
        sendMessageToBackground(
          {
            type: MESSAGE_TYPE.RAW_JS,
            rawjs: jsPackage.trimStart(),
            origin: getCurrentOrigin(),
            version: version,
          },
          response => {
            if (response.valid) {
              resolve(null);
            } else {
              reject();
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

export const processFoundJS = async (version: string): Promise<void> => {
  const scriptsForVersion = FOUND_SCRIPTS.get(version);
  const filterTypeForVersion = filterTypeByVersion.get(version);
  if (!scriptsForVersion || !filterTypeForVersion) {
    invalidateAndThrow(
      `attempting to process scripts for nonexistent version ${version}`,
    );
  }
  const scripts = scriptsForVersion.splice(0).filter(script => {
    if (
      (script.filterTypeRequiredToProcess === ANY_FILTER,
      [
        script.filterTypeRequiredToProcess,
        BOTH_MANIFESTS_LOADED,
        MANIFEST_LOADED,
      ].includes(filterTypeForVersion))
    ) {
      return true;
    } else {
      scriptsForVersion.push(script);
    }
  });
  let pendingScriptCount = scripts.length;
  for (const script of scripts) {
    if ('src' in script) {
      // ScriptDetailsWithSrc
      await processJSWithSrc(script, version).then(response => {
        pendingScriptCount--;
        if (response.valid) {
          if (pendingScriptCount == 0) {
            updateCurrentState(STATES.VALID);
          }
        } else {
          if (response.type === 'EXTENSION') {
            updateCurrentState(STATES.RISK);
          } else {
            updateCurrentState(
              STATES.INVALID,
              `Invalid ScriptDetailsWithSrc ${script.src}`,
            );
          }
        }
        sendMessageToBackground({
          type: MESSAGE_TYPE.DEBUG,
          log:
            'processed JS with SRC response is ' +
            JSON.stringify(response).substring(0, 500),
          src: script.src,
        });
      });
    } else {
      // ScriptDetailsRaw
      sendMessageToBackground(
        {
          type: script.type,
          rawjs: script.rawjs.trimStart(),
          origin: getCurrentOrigin(),
          version: version,
        },
        response => {
          pendingScriptCount--;
          const inlineScriptMap = new Map();
          if (response.valid) {
            inlineScriptMap.set(response.hash, script.rawjs);
            INLINE_SCRIPTS.push(inlineScriptMap);
            if (pendingScriptCount == 0) {
              updateCurrentState(STATES.VALID);
            }
          } else {
            inlineScriptMap.set('hash not in manifest', script.rawjs);
            INLINE_SCRIPTS.push(inlineScriptMap);
            if (
              response.hash &&
              KNOWN_EXTENSION_HASHES.includes(response.hash)
            ) {
              updateCurrentState(STATES.RISK);
            } else {
              updateCurrentState(STATES.INVALID, 'Invalid ScriptDetailsRaw');
            }
          }
          sendMessageToBackground({
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
  window.setTimeout(() => processFoundJS(version), 3000);
};

let isUserLoggedIn = false;
let allowedWorkerCSPs: Array<Set<string>> = [];

export function startFor(origin: Origin, config: ContentScriptConfig): void {
  originConfig = config;
  setCurrentOrigin(origin);
  sendMessageToBackground(
    {
      type: MESSAGE_TYPE.CONTENT_SCRIPT_START,
      checkCSPHeaders: originConfig.enforceCSPHeaders,
      origin,
    },
    resp => {
      if (originConfig.enforceCSPHeaders) {
        if (!resp.cspHeaders) {
          invalidateAndThrow(
            'Expected CSP Headers in CONTENT_SCRIPT_START response',
          );
        }
        checkDocumentCSPHeaders(
          resp.cspHeaders,
          resp.cspReportHeaders,
          getCurrentOrigin(),
        );

        allowedWorkerCSPs = getAllowedWorkerCSPs(resp.cspHeaders);
      }
    },
  );
  if (isPathnameExcluded(originConfig.excludedPathnames)) {
    updateCurrentState(STATES.IGNORE);
    return;
  }
  if (originConfig.checkLoggedInFromCookie) {
    // ds_user_id / c_user contains the user id of the user logged in
    const cookieName =
      origin === ORIGIN_TYPE.INSTAGRAM ? 'ds_user_id' : 'c_user';
    const cookies = document.cookie.split(';');
    cookies.forEach(cookie => {
      const pair = cookie.split('=');
      if (pair[0].indexOf(cookieName) >= 0) {
        isUserLoggedIn = true;
      }
    });
  } else {
    // only doing this check for FB, MSGR, and IG
    isUserLoggedIn = true;
  }
  if (isUserLoggedIn) {
    updateCurrentState(STATES.PROCESSING);
    scanForScripts();
    // set the timeout once, in case there's an iframe and contentUtils sets another manifest timer
    if (manifestTimeoutID === '') {
      manifestTimeoutID = window.setTimeout(() => {
        // Manifest failed to load, flag a warning to the user.
        updateCurrentState(STATES.TIMEOUT);
      }, 45000);
    }
  }
}

chrome.runtime.onMessage.addListener(request => {
  if (request.greeting === 'downloadSource' && DOWNLOAD_JS_ENABLED) {
    downloadJSArchive(SOURCE_SCRIPTS, INLINE_SCRIPTS);
  } else if (request.greeting === 'nocacheHeaderFound') {
    updateCurrentState(
      STATES.INVALID,
      `Detected uncached script ${request.uncachedUrl}`,
    );
  } else if (request.greeting === 'checkIfScriptWasProcessed') {
    if (isUserLoggedIn && !ALL_FOUND_SCRIPT_TAGS.has(request.response.url)) {
      if (
        'serviceWorker' in navigator &&
        navigator.serviceWorker.controller?.scriptURL === request.response.url
      ) {
        return;
      }
      if (originConfig.enforceCSPHeaders) {
        const hostname = window.location.hostname;
        const resourceURL = new URL(request.response.url);
        if (resourceURL.hostname === hostname) {
          // This can potentially be a worker, check if CSPs allow it as a worker
          if (
            allowedWorkerCSPs.every(csp =>
              doesWorkerUrlConformToCSP(csp, resourceURL.toString()),
            )
          ) {
            // This might be a worker, ensure it's CSP headers are valid
            checkWorkerEndpointCSP(
              request.response,
              allowedWorkerCSPs,
              getCurrentOrigin(),
            );
          }
        }
      }
      sendMessageToBackground({
        type: MESSAGE_TYPE.DEBUG,
        log: `Tab is processing ${request.response.url}`,
      });
      ALL_FOUND_SCRIPT_TAGS.add(request.response.url);

      // Normally we use data attributes to get the version and type for a script.
      // We cannot do that in this case because we're intercepting a request and thus
      // have no script tag. Instead we will assume that this belongs to the latest
      // version, and will start processing it as soon as we have loaded any manifest
      // for that version.
      const latestVersionInMap = Array.from(FOUND_SCRIPTS.values()).pop();
      if (latestVersionInMap) {
        latestVersionInMap.push({
          src: request.response.url,
          filterTypeRequiredToProcess: ANY_FILTER,
        });
      }
      updateCurrentState(STATES.PROCESSING);
    }
  } else if (request.greeting === 'sniffableMimeTypeResource') {
    updateCurrentState(
      STATES.INVALID,
      `Sniffable MIME type resource: ${request.src}`,
    );
  }
});
