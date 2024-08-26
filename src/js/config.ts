/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export const STATES = Object.freeze({
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
});

export type State = keyof typeof STATES;

const ICONS = {
  DEFAULT: {
    32: 'default_32.png',
    64: 'default_64.png',
    128: 'default_128.png',
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

export const MESSAGE_TYPE = Object.freeze({
  DEBUG: 'DEBUG',
  LOAD_COMPANY_MANIFEST: 'LOAD_COMPANY_MANIFEST',
  POPUP_STATE: 'POPUP_STATE',
  RAW_JS: 'RAW_JS',
  UPDATE_STATE: 'UPDATE_STATE',
  STATE_UPDATED: 'STATE_UPDATED',
  CONTENT_SCRIPT_START: 'CONTENT_SCRIPT_START',
  UPDATED_CACHED_SCRIPT_URLS: 'UPDATED_CACHED_SCRIPT_URLS',
});

export type MessageType = keyof typeof MESSAGE_TYPE;

export const ORIGIN_HOST: Record<Origin, string> = {
  FACEBOOK: 'facebook.com',
  WHATSAPP: 'whatsapp.com',
  MESSENGER: 'messenger.com',
  INSTAGRAM: 'instagram.com',
};

export const ORIGIN_TIMEOUT = {
  FACEBOOK: 176400000,
  WHATSAPP: 0,
  MESSENGER: 0,
  INSTAGRAM: 0,
};

export const ORIGIN_TYPE = Object.freeze({
  FACEBOOK: 'FACEBOOK',
  WHATSAPP: 'WHATSAPP',
  MESSENGER: 'MESSENGER',
  INSTAGRAM: 'INSTAGRAM',
});

export type Origin = keyof typeof ORIGIN_TYPE;

// Firefox and Safari currently do not support CompressionStream/showSaveFilePicker
export const DOWNLOAD_JS_ENABLED =
  'CompressionStream' in window && 'showSaveFilePicker' in window;

export const MANIFEST_TIMEOUT = 45000;

export const DYNAMIC_STRING_MARKER = '/*BTDS*/';
