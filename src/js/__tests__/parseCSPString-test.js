/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import {parseCSPHeaders} from '../content/parseCSPString';

describe('parseCSPHeaders', () => {
  it('Correctly parses multiple keys/directives', () => {
    expect(
      parseCSPHeaders([
        `default-src 'self' blob:;` + `script-src 'self' 'wasm-unsafe-eval';`,
      ]),
    ).toEqual([
      new Map([
        ['default-src', new Set(["'self'", 'blob:'])],
        ['script-src', new Set(["'self'", "'wasm-unsafe-eval'"])],
      ]),
    ]);
  });
  it('Normalizes CSP keys/values', () => {
    expect(
      parseCSPHeaders([
        `sCriPt-src *.facebook.com *.fbcdn.net blob: data: 'self' 'wasm-UNsafe-eval';`,
      ]),
    ).toEqual([
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
    ]);
  });
  it('Ignores subsequent directive keys', () => {
    expect(
      parseCSPHeaders([
        `script-src 'none';` +
          `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'wasm-UNsafe-eval';` +
          `connect-src 'self';`,
      ]),
    ).toEqual([
      new Map([
        ['script-src', new Set(["'none'"])],
        ['connect-src', new Set(["'self'"])],
      ]),
    ]);
  });
  it('Ignores directives containing non-ASCII characters', () => {
    expect(
      parseCSPHeaders([`default-src 'self';\u00a0script-src 'none';`]),
    ).toEqual([new Map([['default-src', new Set(["'self'"])]])]);
  });
  it('Correctly parses other whitespace chars', () => {
    expect(
      parseCSPHeaders([
        `default-src\t'self' blob:;` + `script-src 'self'\f'wasm-unsafe-eval';`,
      ]),
    ).toEqual([
      new Map([
        ['default-src', new Set(["'self'", 'blob:'])],
        ['script-src', new Set(["'self'", "'wasm-unsafe-eval'"])],
      ]),
    ]);
  });
});
