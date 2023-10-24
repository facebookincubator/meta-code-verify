/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import {jest} from '@jest/globals';
import {checkWorkerEndpointCSP} from '../content/checkWorkerEndpointCSP';
import {ORIGIN_TYPE} from '../config';
import {setCurrentOrigin} from '../content/updateCurrentState';

const CSP_KEY = 'content-security-policy';
const CSPRO_KEY = 'content-security-policy-report-only';

describe('checkWorkerEndpointCSP', () => {
  beforeEach(() => {
    window.chrome.runtime.sendMessage = jest.fn(() => {});
    setCurrentOrigin('FACEBOOK');
  });
  it('Invalid if no CSP headers on Worker script', () => {
    expect(() =>
      checkWorkerEndpointCSP(
        {
          responseHeaders: [],
        }, // Missing headers
        [new Set()],
        ORIGIN_TYPE.FACEBOOK,
      ),
    ).toThrow(new Error('Missing CSP report-only header'));
  });
  it('Invalid if empty CSP headers on Worker script', () => {
    expect(() =>
      checkWorkerEndpointCSP(
        {
          responseHeaders: [
            {name: CSP_KEY, value: ''},
            {name: CSPRO_KEY, value: ''},
          ],
        },
        [new Set()],
        ORIGIN_TYPE.FACEBOOK,
      ),
    ).toThrow(new Error('Missing CSP report-only header'));
  });
  /**
   * Evals covered more extensively by checkDocumentCSPHeaders
   * Same logic is used for both CSPs
   */
  it('Invalid if eval allowed by CSP', () => {
    expect(() =>
      checkWorkerEndpointCSP(
        {
          responseHeaders: [
            {
              name: CSP_KEY,
              value:
                `default-src data: blob: 'self' *.facebook.com *.fbcdn.net 'wasm-unsafe-eval';` +
                `script-src *.facebook.com *.fbcdn.net 'self' 'unsafe-eval';` +
                'worker-src *.facebook.com/worker_url;',
            },
            {name: CSPRO_KEY, value: ''},
          ],
        },
        [new Set(['*.facebook.com/worker_url'])],
        ORIGIN_TYPE.FACEBOOK,
      ),
    ).toThrow(new Error('Missing CSP report-only header'));
  });
  it('Invalid if blob: allowed by script src', () => {
    expect(
      checkWorkerEndpointCSP(
        {
          responseHeaders: [
            {
              name: CSP_KEY,
              value:
                `default-src data: blob: 'self' *.facebook.com *.fbcdn.net 'wasm-unsafe-eval';` +
                `script-src *.facebook.com *.fbcdn.net 'self' blob: 'wasm-unsafe-eval';` +
                'worker-src *.facebook.com/worker_url;',
            },
            {name: CSPRO_KEY, value: ''},
          ],
        },
        [new Set(['*.facebook.com/worker_url'])],
        ORIGIN_TYPE.FACEBOOK,
      ),
    ).toBeFalsy();
  });
  it('Invalid if data: allowed by script src', () => {
    expect(
      checkWorkerEndpointCSP(
        {
          responseHeaders: [
            {
              name: CSP_KEY,
              value:
                `default-src data: blob: 'self' *.facebook.com *.fbcdn.net 'wasm-unsafe-eval';` +
                `script-src *.facebook.com *.fbcdn.net 'self' data: 'wasm-unsafe-eval';` +
                'worker-src *.facebook.com/worker_url;',
            },
            {name: CSPRO_KEY, value: ''},
          ],
        },
        [new Set(['*.facebook.com/worker_url'])],
        ORIGIN_TYPE.FACEBOOK,
      ),
    ).toBeFalsy();
  });
  it('Invalid if blob: allowed by default src', () => {
    expect(
      checkWorkerEndpointCSP(
        {
          responseHeaders: [
            {
              name: CSP_KEY,
              value:
                `default-src blob: 'self' *.facebook.com *.fbcdn.net 'wasm-unsafe-eval';` +
                'worker-src *.facebook.com/worker_url;',
            },
            {name: CSPRO_KEY, value: ''},
          ],
        },
        [new Set(['*.facebook.com/worker_url'])],
        ORIGIN_TYPE.FACEBOOK,
      ),
    ).toBeFalsy();
  });
  it('Invalid if data: allowed by default src', () => {
    expect(
      checkWorkerEndpointCSP(
        {
          responseHeaders: [
            {
              name: CSP_KEY,
              value:
                `default-src data: 'self' *.facebook.com *.fbcdn.net 'wasm-unsafe-eval';` +
                'worker-src *.facebook.com/worker_url;',
            },
            {name: CSPRO_KEY, value: ''},
          ],
        },
        [new Set(['*.facebook.com/worker_url'])],
        ORIGIN_TYPE.FACEBOOK,
      ),
    ).toBeFalsy();
  });
  it('Valid CSP, same url nested workers and different origins', () => {
    expect(
      checkWorkerEndpointCSP(
        {
          responseHeaders: [
            {
              name: CSP_KEY,
              value:
                `default-src data: blob: 'self' *.facebook.com *.fbcdn.net 'wasm-unsafe-eval';` +
                `script-src *.facebook.com *.fbcdn.net 'self' 'wasm-unsafe-eval';` +
                'worker-src *.facebook.com/worker_url *.instagram.com;',
            },
            {name: CSPRO_KEY, value: ''},
          ],
        },
        [new Set(['*.facebook.com/worker_url'])],
        ORIGIN_TYPE.FACEBOOK,
      ),
    ).toBeTruthy();
  });
  it('Valid CSP, nested workers (non-exact match)', () => {
    expect(
      checkWorkerEndpointCSP(
        {
          responseHeaders: [
            {
              name: CSP_KEY,
              value:
                `default-src data: blob: 'self' *.facebook.com *.fbcdn.net 'wasm-unsafe-eval';` +
                `script-src *.facebook.com *.fbcdn.net 'self' 'wasm-unsafe-eval';` +
                'worker-src *.facebook.com/worker_url/;',
            },
            {name: CSPRO_KEY, value: ''},
          ],
        },
        [new Set(['*.facebook.com/worker_url/'])],
        ORIGIN_TYPE.FACEBOOK,
      ),
    ).toBeTruthy();
  });
  it('Valid CSP, subpath nested workers', () => {
    expect(
      checkWorkerEndpointCSP(
        {
          responseHeaders: [
            {
              name: CSP_KEY,
              value:
                `default-src data: blob: 'self' *.facebook.com *.fbcdn.net 'wasm-unsafe-eval';` +
                `script-src *.facebook.com *.fbcdn.net 'self' 'wasm-unsafe-eval';` +
                'worker-src *.facebook.com/worker_url/first *.facebook.com/worker_url/second;',
            },
            {name: CSPRO_KEY, value: ''},
          ],
        },
        [new Set(['*.facebook.com/worker_url/'])],
        ORIGIN_TYPE.FACEBOOK,
      ),
    ).toBeTruthy();
  });
  it('Invalid CSP, subpath nested workers (exact match needed)', () => {
    expect(
      checkWorkerEndpointCSP(
        {
          responseHeaders: [
            {
              name: CSP_KEY,
              value:
                `default-src data: blob: 'self' *.facebook.com *.fbcdn.net 'wasm-unsafe-eval';` +
                `script-src *.facebook.com *.fbcdn.net 'self' 'wasm-unsafe-eval';` +
                'worker-src *.facebook.com/worker_url/first *.facebook.com/worker_url/second;',
            },
            {name: CSPRO_KEY, value: ''},
          ],
        },
        [new Set(['*.facebook.com/worker_url'])],
        ORIGIN_TYPE.FACEBOOK,
      ),
    ).toBeFalsy();
  });
  it('Invalid CSP, different paths', () => {
    expect(
      checkWorkerEndpointCSP(
        {
          responseHeaders: [
            {
              name: CSP_KEY,
              value:
                `default-src data: blob: 'self' *.facebook.com *.fbcdn.net 'wasm-unsafe-eval';` +
                `script-src *.facebook.com *.fbcdn.net 'self' 'wasm-unsafe-eval';` +
                'worker-src *.facebook.com/wrong_worker_url *.facebook.com/worker_url;',
            },
            {name: CSPRO_KEY, value: ''},
          ],
        },
        [new Set(['*.facebook.com/worker_url'])],
        ORIGIN_TYPE.FACEBOOK,
      ),
    ).toBeFalsy();
  });
  it('Invalid CSP, nested worker allowing domain wide urls', () => {
    expect(
      checkWorkerEndpointCSP(
        {
          responseHeaders: [
            {
              name: CSP_KEY,
              value:
                `default-src data: blob: 'self' *.facebook.com *.fbcdn.net 'wasm-unsafe-eval';` +
                `script-src *.facebook.com *.fbcdn.net 'self' 'wasm-unsafe-eval';` +
                'worker-src *.facebook.com/;',
            },
            {name: CSPRO_KEY, value: ''},
          ],
        },
        [new Set(['*.facebook.com/worker_url'])],
        ORIGIN_TYPE.FACEBOOK,
      ),
    ).toBeFalsy();
  });
});
