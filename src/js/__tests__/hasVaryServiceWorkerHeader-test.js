/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import {hasVaryServiceWorkerHeader} from '../content/hasVaryServiceWorkerHeader';

describe('hasVaryServiceWorkerHeader', () => {
  it('detects a lowercase vary header', () => {
    expect(
      hasVaryServiceWorkerHeader({
        responseHeaders: [{name: 'vary', value: 'Service-Worker'}],
      }),
    ).toBe(true);
  });

  it('detects the canonical capitalized Vary header', () => {
    // HTTP header names are case-insensitive and servers send `Vary`
    // capitalized in practice.
    expect(
      hasVaryServiceWorkerHeader({
        responseHeaders: [{name: 'Vary', value: 'Service-Worker'}],
      }),
    ).toBe(true);
  });

  it('detects a lowercase service-worker token in the Vary value', () => {
    // Vary lists request header names, which are also case-insensitive.
    expect(
      hasVaryServiceWorkerHeader({
        responseHeaders: [{name: 'Vary', value: 'Accept, service-worker'}],
      }),
    ).toBe(true);
  });

  it('returns false when no Vary: Service-Worker header is present', () => {
    expect(
      hasVaryServiceWorkerHeader({
        responseHeaders: [
          {name: 'Vary', value: 'Accept-Encoding'},
          {name: 'Content-Type', value: 'text/javascript'},
        ],
      }),
    ).toBe(false);
  });

  it('returns false when there are no response headers', () => {
    expect(hasVaryServiceWorkerHeader({})).toBe(false);
  });
});
