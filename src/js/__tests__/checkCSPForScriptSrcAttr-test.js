/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import {jest} from '@jest/globals';
import {checkDocumentCSPHeaders} from '../content/checkDocumentCSPHeaders';
import {checkCSPForScriptSrcAttr} from '../content/checkCSPForScriptSrcAttr';
import {ORIGIN_TYPE} from '../config';
import {setCurrentOrigin} from '../content/updateCurrentState';

describe('checkCSPForScriptSrcAttr', () => {
  it('allows an explicit script-src-attr none policy', () => {
    const [valid] = checkCSPForScriptSrcAttr([
      `script-src 'unsafe-inline'; script-src-attr 'none';`,
    ]);
    expect(valid).toBeTruthy();
  });

  it('rejects unsafe-inline in script-src-attr', () => {
    const [valid] = checkCSPForScriptSrcAttr([
      `script-src 'self'; script-src-attr 'unsafe-inline';`,
    ]);
    expect(valid).toBeFalsy();
  });

  it('rejects unsafe-hashes with a hash source in script-src-attr', () => {
    const [valid] = checkCSPForScriptSrcAttr([
      `script-src-attr 'unsafe-hashes' 'sha256-abc123';`,
    ]);
    expect(valid).toBeFalsy();
  });

  it('allows unsafe-hashes without a hash source', () => {
    const [valid] = checkCSPForScriptSrcAttr([
      `script-src-attr 'unsafe-hashes';`,
    ]);
    expect(valid).toBeTruthy();
  });

  it('allows a hash source without unsafe-hashes', () => {
    const [valid] = checkCSPForScriptSrcAttr([
      `script-src-attr 'sha256-abc123';`,
    ]);
    expect(valid).toBeTruthy();
  });

  it('falls back to a safe script-src policy', () => {
    const [valid] = checkCSPForScriptSrcAttr([`script-src 'self';`]);
    expect(valid).toBeTruthy();
  });

  it('rejects unsafe-inline from the script-src fallback', () => {
    const [valid] = checkCSPForScriptSrcAttr([
      `script-src 'self' 'unsafe-inline';`,
    ]);
    expect(valid).toBeFalsy();
  });

  it('falls back to a safe default-src policy', () => {
    const [valid] = checkCSPForScriptSrcAttr([`default-src 'self';`]);
    expect(valid).toBeTruthy();
  });

  it('rejects unsafe hashes from the default-src fallback', () => {
    const [valid] = checkCSPForScriptSrcAttr([
      `default-src 'unsafe-hashes' 'sha512-def456';`,
    ]);
    expect(valid).toBeFalsy();
  });

  it('rejects a policy without a script attribute source list', () => {
    const [valid] = checkCSPForScriptSrcAttr([`worker-src example.com;`]);
    expect(valid).toBeFalsy();
  });

  it('accepts multiple policies when one blocks script attributes', () => {
    const [valid] = checkCSPForScriptSrcAttr([
      `script-src-attr 'unsafe-inline';`,
      `script-src-attr 'none';`,
    ]);
    expect(valid).toBeTruthy();
  });

  it('does not use script-src-elem for event-handler attributes', () => {
    const [valid] = checkCSPForScriptSrcAttr([
      `script-src 'self'; script-src-elem 'unsafe-inline';`,
    ]);
    expect(valid).toBeTruthy();
  });

  it('handles directive and source keywords case-insensitively', () => {
    const [valid] = checkCSPForScriptSrcAttr([
      `sCrIpT-sRc-AtTr 'UNSAFE-INLINE';`,
    ]);
    expect(valid).toBeFalsy();
  });
});

describe('checkDocumentCSPHeaders', () => {
  beforeEach(() => {
    window.chrome.runtime.sendMessage = jest.fn(() => {});
    setCurrentOrigin(ORIGIN_TYPE.FACEBOOK);
  });

  it('invalidates a document that allows inline event handlers', () => {
    expect(() =>
      checkDocumentCSPHeaders(
        [
          `script-src 'self';` +
            `script-src-attr 'unsafe-inline';` +
            `worker-src https://workers.example/worker.js;`,
        ],
        [],
        ORIGIN_TYPE.FACEBOOK,
      ),
    ).toThrow('CSP Headers allow unverified script attributes.');
  });
});
