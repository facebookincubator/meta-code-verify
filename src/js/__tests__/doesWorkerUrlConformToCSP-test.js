/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import {doesWorkerUrlConformToCSP} from '../content/doesWorkerUrlConformToCSP';

describe('doesWorkerUrlConformToCSP', () => {
  describe('Edge cases', () => {
    it('Empty worker values', () => {
      expect(doesWorkerUrlConformToCSP(new Set(), '')).toEqual(false);
    });
    it('Empty url', () => {
      expect(
        doesWorkerUrlConformToCSP(new Set(['*.test.com']), ''),
      ).toBeFalsy();
    });
  });
  describe('Exact match', () => {
    const EXACT_URL_SCHEME_VALUE =
      'https://www.facebook.com/worker_init_script';
    it('Allows exact match', () => {
      expect(
        doesWorkerUrlConformToCSP(
          new Set([EXACT_URL_SCHEME_VALUE]),
          'https://www.facebook.com/worker_init_script',
        ),
      ).toBeTruthy();
    });
    it('Allows exact match with search params', () => {
      expect(
        doesWorkerUrlConformToCSP(
          new Set([EXACT_URL_SCHEME_VALUE]),
          'https://www.facebook.com/worker_init_script?p=1&q=2',
        ),
      ).toBeTruthy();
    });
    it('Does not allow trailing slash with exact match', () => {
      expect(
        doesWorkerUrlConformToCSP(
          new Set([EXACT_URL_SCHEME_VALUE]),
          'https://www.facebook.com/worker_init_script/?p=1&q=2',
        ),
      ).toBeFalsy();
    });
    it('Does notllows non-exact match', () => {
      expect(
        doesWorkerUrlConformToCSP(
          new Set([EXACT_URL_SCHEME_VALUE]),
          'https://www.facebook.com/worker_init_script/sub/path',
        ),
      ).toBeFalsy();
    });
  });
  describe('Non exact match', () => {
    const NON_EXACT_URL_SCHEME_VALUE =
      'https://www.facebook.com/worker_init_script/';
    it('Allows exact match', () => {
      expect(
        doesWorkerUrlConformToCSP(
          new Set([NON_EXACT_URL_SCHEME_VALUE]),
          'https://www.facebook.com/worker_init_script/',
        ),
      ).toBeTruthy();
    });
    it('Does not allow missing trailing slash', () => {
      expect(
        doesWorkerUrlConformToCSP(
          new Set([NON_EXACT_URL_SCHEME_VALUE]),
          'https://www.facebook.com/worker_init_script',
        ),
      ).toBeFalsy();
    });
    it('Allows non-exact match', () => {
      expect(
        doesWorkerUrlConformToCSP(
          new Set([NON_EXACT_URL_SCHEME_VALUE]),
          'https://www.facebook.com/worker_init_script/sub/path',
        ),
      ).toBeTruthy();
    });
    it('Allows non-exact match with search params', () => {
      expect(
        doesWorkerUrlConformToCSP(
          new Set([NON_EXACT_URL_SCHEME_VALUE]),
          'https://www.facebook.com/worker_init_script/sub/path?p=1',
        ),
      ).toBeTruthy();
    });
  });
  describe('Wilcards support', () => {
    it('Allows wildcards (exact)', () => {
      expect(
        doesWorkerUrlConformToCSP(
          new Set(['*.facebook.com/worker_init_script']),
          'https://www.facebook.com/worker_init_script',
        ),
      ).toBeTruthy();
    });
    it('Allows custom ports (non-exact)', () => {
      expect(
        doesWorkerUrlConformToCSP(
          new Set(['*://*.facebook.com:*/worker_init_script/']),
          'https://www.facebook.com:84/worker_init_script/',
        ),
      ).toBeTruthy();
    });
  });
});
