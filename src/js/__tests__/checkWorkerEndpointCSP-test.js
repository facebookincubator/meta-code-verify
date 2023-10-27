/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import {jest} from '@jest/globals';
import {
  areBlobAndDataExcluded,
  isWorkerSrcValid,
  isWorkerEndpointCSPValid,
} from '../content/checkWorkerEndpointCSP';
import {ORIGIN_HOST, ORIGIN_TYPE} from '../config';
import {setCurrentOrigin} from '../content/updateCurrentState';

const CSP_KEY = 'content-security-policy';
const CSPRO_KEY = 'content-security-policy-report-only';

describe('checkWorkerEndpointCSP', () => {
  beforeEach(() => {
    window.chrome.runtime.sendMessage = jest.fn(() => {});
    setCurrentOrigin('FACEBOOK');
  });
  it('Invalid if no CSP headers on Worker script', () => {
    const [valid] = isWorkerEndpointCSPValid(
      {
        responseHeaders: [],
      }, // Missing headers
      [new Set()],
      ORIGIN_TYPE.FACEBOOK,
    );
    expect(valid).toBeFalsy();
  });
  it('Invalid if empty CSP headers on Worker script', () => {
    const [valid] = isWorkerEndpointCSPValid(
      {
        responseHeaders: [
          {name: CSP_KEY, value: ''},
          {name: CSPRO_KEY, value: ''},
        ],
      },
      [new Set()],
      ORIGIN_TYPE.FACEBOOK,
    );
    expect(valid).toBeFalsy();
  });

  describe('areBlobAndDataExcluded', () => {
    it('Invalid if blob: allowed by script src', () => {
      const valid = areBlobAndDataExcluded([
        `default-src 'self' *.facebook.com *.fbcdn.net 'wasm-unsafe-eval';` +
          `script-src *.facebook.com *.fbcdn.net 'self' blob: 'wasm-unsafe-eval';`,
      ]);
      expect(valid).toBeFalsy();
    });
    it('Invalid if data: allowed by script src', () => {
      const valid = areBlobAndDataExcluded([
        `default-src 'self' *.facebook.com *.fbcdn.net 'wasm-unsafe-eval';` +
          `script-src *.facebook.com *.fbcdn.net 'self' data: 'wasm-unsafe-eval';`,
      ]);
      expect(valid).toBeFalsy();
    });
    it('Invalid if blob: allowed by default src', () => {
      const valid = areBlobAndDataExcluded([
        `default-src blob: 'self' *.facebook.com *.fbcdn.net 'wasm-unsafe-eval';`,
      ]);
      expect(valid).toBeFalsy();
    });
    it('Invalid if data: allowed by default src', () => {
      const valid = areBlobAndDataExcluded([
        `default-src data: 'self' *.facebook.com *.fbcdn.net 'wasm-unsafe-eval';`,
      ]);
      expect(valid).toBeFalsy();
    });
  });

  describe('isWorkerSrcValid', () => {
    it('Valid CSP, same url nested workers and different origins', () => {
      const valid = isWorkerSrcValid(
        ['worker-src *.facebook.com/worker_url *.instagram.com;'],
        ORIGIN_HOST[ORIGIN_TYPE.FACEBOOK],
        [new Set(['*.facebook.com/worker_url'])],
      );
      expect(valid).toBeTruthy();
    });
    it('Valid CSP, nested workers (non-exact match)', () => {
      const valid = isWorkerSrcValid(
        ['worker-src *.facebook.com/worker_url/;'],
        ORIGIN_HOST[ORIGIN_TYPE.FACEBOOK],
        [new Set(['*.facebook.com/worker_url/'])],
      );
      expect(valid).toBeTruthy();
    });
    it('Valid CSP, subpath nested workers', () => {
      const valid = isWorkerSrcValid(
        [
          'worker-src *.facebook.com/worker_url/first *.facebook.com/worker_url/second;',
        ],
        ORIGIN_HOST[ORIGIN_TYPE.FACEBOOK],
        [new Set(['*.facebook.com/worker_url/'])],
      );
      expect(valid).toBeTruthy();
    });

    it('Invalid CSP, subpath nested workers (exact match needed)', () => {
      const valid = isWorkerSrcValid(
        [
          'worker-src *.facebook.com/worker_url/first *.facebook.com/worker_url/second;',
        ],
        ORIGIN_HOST[ORIGIN_TYPE.FACEBOOK],
        [new Set(['*.facebook.com/worker_url'])],
      );
      expect(valid).toBeFalsy();
    });
    it('Invalid CSP, different paths', () => {
      const valid = isWorkerSrcValid(
        [
          'worker-src *.facebook.com/wrong_worker_url *.facebook.com/worker_url;',
        ],
        ORIGIN_HOST[ORIGIN_TYPE.FACEBOOK],
        [new Set(['*.facebook.com/worker_url'])],
      );
      expect(valid).toBeFalsy();
    });
    it('Invalid CSP, nested worker allowing domain wide urls', () => {
      const valid = isWorkerSrcValid(
        ['worker-src *.facebook.com/;'],
        ORIGIN_HOST[ORIGIN_TYPE.FACEBOOK],
        [new Set(['*.facebook.com/worker_url'])],
      );
      expect(valid).toBeFalsy();
    });
  });
});
