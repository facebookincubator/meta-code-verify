/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import {parseCSPString} from '../content/parseCSPString';

describe('parseCSPString', () => {
  it('Correctly parses multiple keys/directives', () => {
    expect(
      parseCSPString(
        `default-src 'self' blob:;` + `script-src 'self' 'wasm-unsafe-eval';`,
      ),
    ).toEqual(
      new Map([
        ['default-src', new Set(["'self'", 'blob:'])],
        ['script-src', new Set(["'self'", "'wasm-unsafe-eval'"])],
      ]),
    );
  });
  it('Normalizes CSP keys/values', () => {
    expect(
      parseCSPString(
        `sCriPt-src *.facebook.com *.fbcdn.net blob: data: 'self' 'wasm-UNsafe-eval';`,
      ),
    ).toEqual(
      new Map([
        [
          'script-src',
          new Set([
            '*.facebook.com',
            '*.fbcdn.net',
            'blob:',
            'data:',
            "'self'",
            "'wasm-unsafe-eval'",
          ]),
        ],
      ]),
    );
  });
  it('Ignores subsequent directive keys', () => {
    expect(
      parseCSPString(
        `script-src 'none';` +
          `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'wasm-UNsafe-eval';` +
          `connect-src 'self';`,
      ),
    ).toEqual(
      new Map([
        ['script-src', new Set(["'none'"])],
        ['connect-src', new Set(["'self'"])],
      ]),
    );
  });
});
