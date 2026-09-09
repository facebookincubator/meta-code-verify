/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import {jest} from '@jest/globals';
import {isWorkerEndpointCSPValid} from '../content/checkWorkerEndpointCSP';
import doesWorkerUrlConformToCSPModule from '../content/doesWorkerUrlConformToCSP';
import {ORIGIN_TYPE} from '../config';
import {setCurrentOrigin} from '../content/updateCurrentState';

const {default: doesWorkerUrlConformToCSP} = doesWorkerUrlConformToCSPModule;

const CSP_KEY = 'content-security-policy';
const CSPRO_KEY = 'content-security-policy-report-only';
const WORKER_SRC = '*.facebook.com/worker_url';
const EXACT_WORKER_URL = 'https://www.facebook.com/worker_init_script';
const PREFIX_WORKER_URL = 'https://www.facebook.com/worker_init_script/';

function isWorkerEndpointResponseValid(
  responseHeaders,
  documentWorkerCSPs = [new Set([WORKER_SRC])],
) {
  return isWorkerEndpointCSPValid(
    {responseHeaders},
    documentWorkerCSPs,
    ORIGIN_TYPE.FACEBOOK,
  ).valid;
}

function isWorkerEndpointPolicyValid(csp) {
  return isWorkerEndpointResponseValid([
    {name: CSP_KEY, value: `${csp}worker-src ${WORKER_SRC};`},
  ]);
}

function isNestedWorkerPolicyValid(workerSrc, documentWorkerSrc) {
  return isWorkerEndpointResponseValid(
    [{name: CSP_KEY, value: `script-src 'self'; ${workerSrc}`}],
    [new Set([documentWorkerSrc])],
  );
}

describe('checkWorkerEndpointCSP', () => {
  beforeEach(() => {
    window.chrome.runtime.sendMessage = jest.fn(() => {});
    setCurrentOrigin('FACEBOOK');
  });

  it('rejects missing or empty CSP headers', () => {
    expect(isWorkerEndpointResponseValid([])).toBeFalsy();
    expect(
      isWorkerEndpointResponseValid([
        {name: CSP_KEY, value: ''},
        {name: CSPRO_KEY, value: ''},
      ]),
    ).toBeFalsy();
  });

  it('rejects blob: and data: in effective script sources', () => {
    const invalidPolicies = [
      `default-src 'self' *.facebook.com *.fbcdn.net 'wasm-unsafe-eval';` +
        `script-src *.facebook.com *.fbcdn.net 'self' blob: 'wasm-unsafe-eval';`,
      `default-src 'self' *.facebook.com *.fbcdn.net 'wasm-unsafe-eval';` +
        `script-src *.facebook.com *.fbcdn.net 'self' data: 'wasm-unsafe-eval';`,
      `default-src blob: 'self' *.facebook.com *.fbcdn.net 'wasm-unsafe-eval';`,
      `default-src data: 'self' *.facebook.com *.fbcdn.net 'wasm-unsafe-eval';`,
    ];

    invalidPolicies.forEach(policy => {
      expect(isWorkerEndpointPolicyValid(policy)).toBeFalsy();
    });
  });

  it('accepts allowed nested worker sources', () => {
    const validPolicies = [
      [
        'worker-src *.facebook.com/worker_url *.instagram.com;',
        '*.facebook.com/worker_url',
      ],
      ['worker-src *.facebook.com/worker_url/;', '*.facebook.com/worker_url/'],
      [
        'worker-src *.facebook.com/worker_url/first *.facebook.com/worker_url/second;',
        '*.facebook.com/worker_url/',
      ],
    ];

    validPolicies.forEach(([workerSrc, documentWorkerSrc]) => {
      expect(
        isNestedWorkerPolicyValid(workerSrc, documentWorkerSrc),
      ).toBeTruthy();
    });
  });

  it('rejects disallowed nested worker sources', () => {
    const invalidPolicies = [
      [
        'worker-src *.facebook.com/worker_url/first *.facebook.com/worker_url/second;',
        '*.facebook.com/worker_url',
      ],
      [
        'worker-src *.facebook.com/wrong_worker_url *.facebook.com/worker_url;',
        '*.facebook.com/worker_url',
      ],
      ['worker-src *.facebook.com/;', '*.facebook.com/worker_url'],
    ];

    invalidPolicies.forEach(([workerSrc, documentWorkerSrc]) => {
      expect(
        isNestedWorkerPolicyValid(workerSrc, documentWorkerSrc),
      ).toBeFalsy();
    });
  });
});

describe('doesWorkerUrlConformToCSP', () => {
  it('rejects empty source lists and URLs', () => {
    expect(doesWorkerUrlConformToCSP(new Set(), '')).toBeFalsy();
    expect(doesWorkerUrlConformToCSP(new Set(['*.test.com']), '')).toBeFalsy();
  });

  it('matches exact paths and optional query strings', () => {
    const workerValues = new Set([EXACT_WORKER_URL]);

    expect(doesWorkerUrlConformToCSP(workerValues, EXACT_WORKER_URL)).toBe(
      true,
    );
    expect(
      doesWorkerUrlConformToCSP(workerValues, `${EXACT_WORKER_URL}?p=1&q=2`),
    ).toBe(true);
    expect(
      doesWorkerUrlConformToCSP(workerValues, `${EXACT_WORKER_URL}/?p=1&q=2`),
    ).toBe(false);
    expect(
      doesWorkerUrlConformToCSP(workerValues, `${EXACT_WORKER_URL}/sub/path`),
    ).toBe(false);
  });

  it('matches paths below sources with a trailing slash', () => {
    const workerValues = new Set([PREFIX_WORKER_URL]);

    expect(doesWorkerUrlConformToCSP(workerValues, PREFIX_WORKER_URL)).toBe(
      true,
    );
    expect(doesWorkerUrlConformToCSP(workerValues, EXACT_WORKER_URL)).toBe(
      false,
    );
    expect(
      doesWorkerUrlConformToCSP(workerValues, `${PREFIX_WORKER_URL}sub/path`),
    ).toBe(true);
    expect(
      doesWorkerUrlConformToCSP(
        workerValues,
        `${PREFIX_WORKER_URL}sub/path?p=1`,
      ),
    ).toBe(true);
  });

  it('matches wildcard hosts, schemes, and ports', () => {
    expect(
      doesWorkerUrlConformToCSP(
        new Set(['*.facebook.com/worker_init_script']),
        EXACT_WORKER_URL,
      ),
    ).toBe(true);
    expect(
      doesWorkerUrlConformToCSP(
        new Set(['*://*.facebook.com:*/worker_init_script/']),
        'https://www.facebook.com:84/worker_init_script/',
      ),
    ).toBe(true);
  });
});
