/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  MESSAGE_TYPE,
  DOWNLOAD_SRC_ENABLED,
  STATES,
  Origin,
  ORIGIN_TYPE,
  MANIFEST_TIMEOUT,
} from './config';

import {
  checkDocumentCSPHeaders,
  getAllowedWorkerCSPs,
} from './content/checkDocumentCSPHeaders';
import {
  getCurrentOrigin,
  setCurrentOrigin,
  updateCurrentState,
  invalidateAndThrow,
} from './content/updateCurrentState';
import {sendMessageToBackground} from './shared/sendMessageToBackground';
import {parseFailedJSON} from './content/parseFailedJSON';
import isPathnameExcluded from './content/isPathNameExcluded';
import {doesWorkerUrlConformToCSP} from './content/doesWorkerUrlConformToCSP';
import {checkWorkerEndpointCSP} from './content/checkWorkerEndpointCSP';
import {MessagePayload} from './shared/MessageTypes';
import {pushToOrCreateArrayInMap} from './shared/nestedDataHelpers';
import ensureManifestWasOrWillBeLoaded from './content/ensureManifestWasOrWillBeLoaded';
import {downloadSrc, processSrc} from './content/contentUtils';
import {hasVaryServiceWorkerHeader} from './content/hasVaryServiceWorkerHeader';
import {isSameDomainAsTopWindow, isTopWindow} from './content/iFrameUtils';
import {getTagIdentifier} from './content/getTagIdentifier';
import {
  BOTH,
  getManifestVersionAndTypeFromNode,
  tryToGetManifestVersionAndTypeFromNode,
} from './content/getManifestVersionAndTypeFromNode';
import {scanForCSSNeedingManualInspsection} from './content/manualCSSInspector';

type ContentScriptConfig = {
  checkLoggedInFromCookie: boolean;
  excludedPathnames: Array<RegExp>;
};

let originConfig: ContentScriptConfig | null = null;

export const UNINITIALIZED = 'UNINITIALIZED';
let currentFilterType = UNINITIALIZED;
// Map<version, Array<TagDetails>>
export const FOUND_ELEMENTS = new Map<string, Array<TagDetails>>([
  [UNINITIALIZED, []],
]);
const ALL_FOUND_TAGS_URLS = new Set<string>();
const FOUND_MANIFEST_VERSIONS = new Set<string>();

export type TagDetails =
  | {
      otherType: string;
      src: string;
      isServiceWorker?: boolean;
      type: 'script';
    }
  | {
      otherType: string;
      href: string;
      type: 'link';
    }
  | {
      otherType: string;
      tag: HTMLStyleElement;
      type: 'style';
    };
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

  const leaves = rawManifest.manifest;
  const otherHashes = rawManifest.manifest_hashes;
  const roothash = otherHashes.combined_hash;

  let otherType = '';
  let version = '';

  const maybeManifestType = manifestNode.getAttribute('data-manifest-type');
  if (maybeManifestType === null) {
    updateCurrentState(
      STATES.INVALID,
      'manifest is missing `data-manifest-type` prop',
    );
  } else {
    otherType = maybeManifestType;
  }

  const maybeManifestRev = manifestNode.getAttribute('data-manifest-rev');
  if (maybeManifestRev === null) {
    updateCurrentState(
      STATES.INVALID,
      'manifest is missing `data-manifest-rev` prop',
    );
  } else {
    version = maybeManifestRev;
  }

  // If this is the first manifest we've found, start processing scripts for
  // that type. If we have encountered a second manifest, we can assume both
  // main and longtail manifests are present.
  if (currentFilterType === UNINITIALIZED) {
    currentFilterType = otherType;
  } else {
    currentFilterType = BOTH;
  }

  const messagePayload: MessagePayload = {
    type: MESSAGE_TYPE.LOAD_COMPANY_MANIFEST,
    leaves,
    origin: getCurrentOrigin(),
    otherHashes: otherHashes,
    rootHash: roothash,
    workaround: manifestNode.innerHTML,
    version,
  };

  // now that we know the actual version of the scripts, transfer the ones we know about.
  // also set the correct manifest type, "otherType" for already collected scripts
  const foundElementsWithoutVersion = FOUND_ELEMENTS.get(UNINITIALIZED);
  if (foundElementsWithoutVersion) {
    const elementsWithUpdatedType = foundElementsWithoutVersion.map(
      element => ({
        ...element,
        otherType: currentFilterType,
      }),
    );

    FOUND_ELEMENTS.set(version, [
      ...elementsWithUpdatedType,
      ...(FOUND_ELEMENTS.get(version) ?? []),
    ]);
    FOUND_ELEMENTS.delete(UNINITIALIZED);
  } else if (!FOUND_ELEMENTS.has(version)) {
    // New version is being loaded in
    FOUND_ELEMENTS.set(version, []);
  }

  sendMessageToBackground(messagePayload, response => {
    // then start processing its JS/CSS
    if (response.valid) {
      if (manifestTimeoutID !== '') {
        clearTimeout(manifestTimeoutID);
        manifestTimeoutID = '';
      }
      FOUND_MANIFEST_VERSIONS.add(version);
      window.setTimeout(() => processFoundElements(version), 0);
    } else {
      if ('UNKNOWN_ENDPOINT_ISSUE' === response.reason) {
        updateCurrentState(STATES.TIMEOUT);
        return;
      }
      updateCurrentState(STATES.INVALID);
    }
  });
}

export const processFoundElements = async (version: string): Promise<void> => {
  const elementsForVersion = FOUND_ELEMENTS.get(version);
  if (!elementsForVersion) {
    invalidateAndThrow(
      `attempting to process elements for nonexistent version ${version}`,
    );
  }
  const elements = elementsForVersion.splice(0).filter(element => {
    if (
      element.otherType === currentFilterType ||
      [BOTH, UNINITIALIZED].includes(currentFilterType)
    ) {
      return true;
    } else {
      elementsForVersion.push(element);
    }
  });
  let pendingElementCount = elements.length;
  for (const element of elements) {
    await processSrc(element, version).then(response => {
      const tagIdentifier = getTagIdentifier(element);

      pendingElementCount--;
      if (response.valid) {
        if (pendingElementCount == 0) {
          updateCurrentState(STATES.VALID);
        }
      } else {
        updateCurrentState(STATES.INVALID, `Invalid Tag ${tagIdentifier}`);
      }
      sendMessageToBackground({
        type: MESSAGE_TYPE.DEBUG,
        log:
          'processed SRC response is ' +
          JSON.stringify(response).substring(0, 500),
        src: tagIdentifier,
      });
    });
  }
  window.setTimeout(() => processFoundElements(version), 3000);
};

function handleScriptNode(scriptNode: HTMLScriptElement): void {
  const [version, otherType] = getManifestVersionAndTypeFromNode(scriptNode);
  ALL_FOUND_TAGS_URLS.add(scriptNode.src);
  ensureManifestWasOrWillBeLoaded(FOUND_MANIFEST_VERSIONS, version);
  pushToOrCreateArrayInMap(FOUND_ELEMENTS, version, {
    src: scriptNode.src,
    otherType,
    type: 'script',
  });
  updateCurrentState(STATES.PROCESSING);
}

function handleStyleNode(style: HTMLStyleElement): void {
  const versionAndOtherType = tryToGetManifestVersionAndTypeFromNode(style);
  if (versionAndOtherType == null) {
    // Will be handled by manualCSSInspector
    return;
  }
  const [version, otherType] = versionAndOtherType;
  ensureManifestWasOrWillBeLoaded(FOUND_MANIFEST_VERSIONS, version);
  pushToOrCreateArrayInMap(FOUND_ELEMENTS, version, {
    tag: style,
    otherType: otherType,
    type: 'style',
  });
  updateCurrentState(STATES.PROCESSING);
}

function handleLinkNode(link: HTMLLinkElement): void {
  const [version, otherType] = getManifestVersionAndTypeFromNode(link);
  ALL_FOUND_TAGS_URLS.add(link.href);
  ensureManifestWasOrWillBeLoaded(FOUND_MANIFEST_VERSIONS, version);
  pushToOrCreateArrayInMap(FOUND_ELEMENTS, version, {
    href: link.href,
    otherType,
    type: 'link',
  });
  updateCurrentState(STATES.PROCESSING);
}

export function storeFoundElement(element: HTMLElement): void {
  if (!isTopWindow() && isSameDomainAsTopWindow()) {
    // this means that content utils is running in an iframe - disable timer and call processFoundElements on manifest processed in top level frame
    clearTimeout(manifestTimeoutID);
    manifestTimeoutID = '';
    FOUND_ELEMENTS.forEach((_val, key) => {
      window.setTimeout(() => processFoundElements(key), 0);
    });
  }

  // check if it's the manifest node
  if (
    (isTopWindow() || !isSameDomainAsTopWindow()) &&
    (element.id === 'binary-transparency-manifest' ||
      element.getAttribute('name') === 'binary-transparency-manifest')
  ) {
    handleManifestNode(element as HTMLScriptElement);
  }

  // Only a document/doctype can have textContent as null
  const nodeTextContent = element.textContent ?? '';
  if (element.getAttribute('type') === 'application/json') {
    try {
      JSON.parse(nodeTextContent);
    } catch (parseError) {
      setTimeout(() => parseFailedJSON({node: element, retry: 1500}), 20);
    }
    return;
  }

  if (element.nodeName.toLowerCase() === 'script') {
    const script = element as HTMLScriptElement;
    if (
      script.src != null &&
      script.src !== '' &&
      script.src.indexOf('blob:') === 0
    ) {
      // TODO: try to process the blob. For now, flag as warning.
      updateCurrentState(STATES.INVALID, 'blob: src');
      return;
    }
    if (script.src !== '') {
      handleScriptNode(script);
    }
  } else if (element.nodeName.toLowerCase() === 'style') {
    const style = element as HTMLStyleElement;
    if (style.innerHTML !== '') {
      handleStyleNode(style);
    }
  } else if (element.nodeName.toLowerCase() === 'link') {
    handleLinkNode(element as HTMLLinkElement);
  }
}

export function hasInvalidScriptsOrStyles(scriptNodeMaybe: Node): void {
  // if not an HTMLElement ignore it!
  if (scriptNodeMaybe.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  const nodeName = scriptNodeMaybe.nodeName.toLowerCase();

  if (
    nodeName === 'script' ||
    nodeName === 'style' ||
    (nodeName === 'link' &&
      (scriptNodeMaybe as HTMLElement).getAttribute('rel') == 'stylesheet')
  ) {
    storeFoundElement(scriptNodeMaybe as HTMLElement);
  } else if (scriptNodeMaybe.childNodes.length > 0) {
    scriptNodeMaybe.childNodes.forEach(childNode => {
      hasInvalidScriptsOrStyles(childNode);
    });
  }
}

export const scanForScriptsAndStyles = (): void => {
  const allElements = document.querySelectorAll(
    'script,style,link[rel="stylesheet"]',
  );
  Array.from(allElements).forEach(element => {
    storeFoundElement(element as HTMLElement);
  });

  try {
    // track any new tags that get loaded in
    const mutationObserver = new MutationObserver(mutationsList => {
      mutationsList.forEach(mutation => {
        if (mutation.type === 'childList') {
          Array.from(mutation.addedNodes).forEach(node => {
            // Code within a script or style tag has changed
            const targetNodeName = mutation.target.nodeName.toLocaleLowerCase();
            if (
              node.nodeType === Node.TEXT_NODE &&
              (targetNodeName === 'script' || targetNodeName === 'style')
            ) {
              hasInvalidScriptsOrStyles(mutation.target);
            } else {
              hasInvalidScriptsOrStyles(node);
            }
          });
        }
      });
    });

    mutationObserver.observe(document, {
      attributes: true,
      childList: true,
      subtree: true,
    });
  } catch (_UnknownError) {
    updateCurrentState(STATES.INVALID, 'unknown');
  }
};

let isUserLoggedIn = false;
let allowedWorkerCSPs: Array<Set<string>> = [];

export function startFor(origin: Origin, config: ContentScriptConfig): void {
  originConfig = config;
  setCurrentOrigin(origin);
  sendMessageToBackground(
    {
      type: MESSAGE_TYPE.CONTENT_SCRIPT_START,
      origin,
    },
    resp => {
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
    scanForScriptsAndStyles();
    scanForCSSNeedingManualInspsection();
    // set the timeout once, in case there's an iframe and contentUtils sets another manifest timer
    if (manifestTimeoutID === '') {
      manifestTimeoutID = window.setTimeout(() => {
        // Manifest failed to load, flag a warning to the user.
        updateCurrentState(STATES.TIMEOUT);
      }, MANIFEST_TIMEOUT);
    }
  }
}

chrome.runtime.onMessage.addListener(request => {
  if (request.greeting === 'downloadSource' && DOWNLOAD_SRC_ENABLED) {
    downloadSrc();
  } else if (request.greeting === 'nocacheHeaderFound') {
    updateCurrentState(
      STATES.INVALID,
      `Detected uncached script/style ${request.uncachedUrl}`,
    );
  } else if (request.greeting === 'checkIfScriptWasProcessed') {
    if (isUserLoggedIn && !ALL_FOUND_TAGS_URLS.has(request.response.url)) {
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
      sendMessageToBackground({
        type: MESSAGE_TYPE.DEBUG,
        log: `Tab is processing ${request.response.url}`,
      });
      ALL_FOUND_TAGS_URLS.add(request.response.url);
      const uninitializedScripts = FOUND_ELEMENTS.get(
        FOUND_ELEMENTS.keys().next().value,
      );
      if (uninitializedScripts) {
        uninitializedScripts.push({
          src: request.response.url,
          otherType: currentFilterType,
          isServiceWorker: hasVaryServiceWorkerHeader(request.response),
          type: 'script',
        });
      }
      updateCurrentState(STATES.PROCESSING);
    }
  } else if (request.greeting === 'sniffableMimeTypeResource') {
    updateCurrentState(
      STATES.INVALID,
      `Sniffable MIME type resource: ${request.src}`,
    );
  } else if (request.greeting === 'downloadReleaseSource') {
    for (const key of FOUND_ELEMENTS.keys()) {
      if (key !== 'UNINITIALIZED') {
        window.open(
          `https://www.facebook.com/btarchive/${key}/${getCurrentOrigin().toLowerCase()}`,
          '_blank',
          'noopener,noreferrer',
        );
      }
    }
  }
});
