/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export const STATES = {
  // Starting state for all frames/tabs
  START: 'START',
  // Tab is processing scripts
  PROCESSING: 'PROCESSING',
  // Disable the extension (it shouldn't be running on this tab)
  IGNORE: 'IGNORE',
  // Script verification against the manifest failed.
  INVALID: 'INVALID',
  // Unknown inline script from an extension was found
  RISK: 'RISK',
  // All script verifications succeeded
  VALID: 'VALID',
  // Timed out waiting for the manifest to be available on the page
  TIMEOUT: 'TIMEOUT',
};

const ICONS = {
  DEFAULT: {
    32: 'default_32.png',
    64: 'default_64.png',
    128: 'default_64@2x.png',
  },
  FAILURE: {
    32: 'failure_32.png',
  },
  RISK: {
    32: 'risk_32.png',
  },
  VALID: {
    32: 'validated_32.png',
  },
};

export const STATES_TO_ICONS = {
  [STATES.START]: ICONS.DEFAULT,
  [STATES.PROCESSING]: ICONS.DEFAULT,
  [STATES.IGNORE]: ICONS.DEFAULT,
  [STATES.INVALID]: ICONS.FAILURE,
  [STATES.RISK]: ICONS.RISK,
  [STATES.VALID]: ICONS.VALID,
  [STATES.TIMEOUT]: ICONS.RISK,
};

export const ICON_STATE = {
  DEFAULT: { badge: 'icon-badge.svg', popup: 'popup.html?state=loading' },
  INVALID_HARD: {
    // badge: 'error-badge.svg',
    badge: {
      32: 'failure_32.png',
    },
    popup: 'popup.html?state=error',
  },
  INVALID_SOFT: {
    // badge: 'error-badge.svg',
    badge: {
      32: 'failure_32.png',
    },
    popup: 'popup.html?state=error',
  },
  PROCESSING: {
    // badge: 'icon-badge.svg',
    badge: {
      32: 'default_32.png',
    },
    popup: 'popup.html?state=loading',
  },
  VALID: {
    // badge: 'validated-badge.svg',
    badge: {
      32: 'validated_32.png',
    },
    popup: 'popup.html?state=valid',
  },
  WARNING_RISK: {
    // badge: 'warning-badge.svg',
    badge: {
      32: 'risk_32.png',
    },
    popup: 'popup.html?state=warning_risk',
  },
  WARNING_TIMEOUT: {
    // badge: 'warning-badge.svg',
    badge: {
      32: 'risk_32.png',
    },
    popup: 'popup.html?state=warning_timeout',
  },
};

export const KNOWN_EXTENSION_HASHES = [
  '', // Chrome - Dynamic: StopAll Ads
  '727bfede71f473991faeb7f4b65632c93e7f7d17189f1b3d952cd990cd150808', // Chrome and Edge: Avast Online Security & Privacy v21.0.101
  'c09a2e7b2fa97705c9afe890498e1f620ede4bd2968cfef7421080a8f9f0d8f9', // Chrome: Privacy Badger v2021.11.23.1
  '04c354b90b330f4cac2678ccd311e5d2a6e8b57815510b176ddbed8d52595726', // Chrome: LastPass v4.88.0
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // Chrome: AdLock - adblocker & privacy protection v0.1.30
  '', // Chrome - Dynamic: AdBlocker Ultimate v3.7.15
  '', // Chrome - Dynamic: DuckDuckGo Privacy Essentials v2022.2.22
  '', // Chrome - Dynamic: Crystal Ad block v1.3.9
  '', // Chrome - Dynamic: AdBlock — best ad blocker v4.43.0
  '4ae6b4dcefb37952cef704c39fe3e8d675bd32c54302984e747ba6768541862a', // Chrome: Vue.js devtools v6.0.12
  '91fecf0ca4c2260f8a18d1c371d717e656e98a0015f0206379afe662746d6009', // Chrome: Vue.js devtools v6.0.12
  'e64b3a9472f559611158a628da06e770ce8cc3d0f8395849072a0199bae705f9', // FF: Total Adblock-Ad Blocker v2.10.0 *and* FF/Edge BitGuard v1.0
  'c924b9ed122066e5420b125a1accb787c3856c4a422fe9bde47d1f40660271a6', // FF: Smart Blocker v1.0.2
  '', // FF: Popup Blocker(strict)
  '', // FF - Dynamic: Privacy Tweaks
  '', // FF: Privacy Possum
  '', // FF - Dynamic: Adblocker X v2.0.5
  '', // FF - Dynamic: AdBlocker Ultimate v3.7.15
  '', // FF - Dynamic: Cloudopt AdBlocker v2.3.0
  '', // Edge - Dynamic: Epsilon Ad blocker v1.4.6
  '7a69d1fb29471a9962307f7882adade784141d02617e233eb366ae5f63fd9dd8', // Edge and FF: Minimal Consent v1.0.9
  'd768396bbfda57a3defb0aeba5d9b9aefef562d8204520668f9e275c68455a0c', // Edge: Writer from Writer.com v1.63.2
  '', // Edge - Dynamic: AdBlock --- best ad blocker v4.43.0
  '855e2fd1368fc12a14159e26ed3132e6567e8443f8b75081265b93845b865103', // Edge and FF: AdGuard AdBlocker v3.6.17
  'deda33bced5f2014562e03f8c82a2a16df074a2bc6be6eceba78274056e41372', // Edge: Netcraft Extension v1.16.8
  '', // Edge - Dynamic: Hola ad remover v1.194.444
  '', // Edge - Dynamic: Tau adblock v1.4.1
];

export const MESSAGE_TYPE = {
  DEBUG: 'DEBUG',
  GET_DEBUG: 'GET_DEBUG',
  LOAD_MANIFEST: 'LOAD_MANIFEST',
  POPUP_STATE: 'POPUP_STATE',
  RAW_JS: 'RAW_JS',
  UPDATE_STATE: 'UPDATE_STATE',
  STATE_UPDATED: 'STATE_UPDATED',
  CONTENT_SCRIPT_START: 'CONTENT_SCRIPT_START',
};

export const ORIGIN_HOST = {
  FACEBOOK: 'facebook.com',
  WHATSAPP: 'whatsapp.com',
  MESSENGER: 'messenger.com',
};

export const ORIGIN_TIMEOUT = {
  FACEBOOK: 176400000,
  WHATSAPP: 0,
  MESSENGER: 0,
};

export const ORIGIN_TYPE = {
  FACEBOOK: 'FACEBOOK',
  WHATSAPP: 'WHATSAPP',
  MESSENGER: 'MESSENGER',
};

// Firefox and Safari currently do not support CompressionStream
export const DOWNLOAD_JS_ENABLED = 'CompressionStream' in window;
