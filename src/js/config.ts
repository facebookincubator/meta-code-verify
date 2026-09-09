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

export const ORIGIN_HOST: Record<Origin, string> = {
  FACEBOOK: 'facebook.com',
  WHATSAPP: 'whatsapp.com',
  MESSENGER: 'messenger.com',
  INSTAGRAM: 'instagram.com',
};

export const ORIGIN_TYPE = Object.freeze({
  FACEBOOK: 'FACEBOOK',
  WHATSAPP: 'WHATSAPP',
  MESSENGER: 'MESSENGER',
  INSTAGRAM: 'INSTAGRAM',
});

export type Origin = keyof typeof ORIGIN_TYPE;

export const MANIFEST_TIMEOUT = 45000;

export const DYNAMIC_STRING_MARKER = '/*BTDS*/';
