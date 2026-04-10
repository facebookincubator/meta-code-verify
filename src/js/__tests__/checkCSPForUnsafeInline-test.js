/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import {jest} from '@jest/globals';
import {checkCSPForUnsafeInline} from '../content/checkCSPForUnsafeInline';
import {setCurrentOrigin} from '../content/updateCurrentState';

describe('checkCSPForUnsafeInline', () => {
  beforeEach(() => {
    window.chrome.runtime.sendMessage = jest.fn(() => {});
    setCurrentOrigin('FACEBOOK');
  });
  it('Valid due to script-src', () => {
    const [valid] = checkCSPForUnsafeInline([
      `default-src 'unsafe-inline';` + `script-src 'self';`,
    ]);
    expect(valid).toBeTruthy();
  });
  it('Invalid due to script-src', () => {
    const [valid] = checkCSPForUnsafeInline([
      `default-src 'unsafe-inline';` + `script-src 'self' 'unsafe-inline';`,
    ]);
    expect(valid).toBeFalsy();
  });
  it('Valid due to default-src', () => {
    const [valid] = checkCSPForUnsafeInline([`default-src 'self';`]);
    expect(valid).toBeTruthy();
  });
  it('Invalid due to default-src', () => {
    const [valid] = checkCSPForUnsafeInline([
      `default-src 'self' 'unsafe-inline';`,
    ]);
    expect(valid).toBeFalsy();
  });
  it('Valid despite nonce in script-src', () => {
    const [valid] = checkCSPForUnsafeInline([
      `script-src 'self' 'nonce-abc123';`,
    ]);
    expect(valid).toBeTruthy();
  });
  it('Invalid due to unsafe-hashes in script-src', () => {
    const [valid] = checkCSPForUnsafeInline([
      `script-src 'self' 'unsafe-hashes' 'sha256-abc123';`,
    ]);
    expect(valid).toBeFalsy();
  });
  it('Valid despite nonce in default-src', () => {
    const [valid] = checkCSPForUnsafeInline([
      `default-src 'self' 'nonce-xyz789';`,
    ]);
    expect(valid).toBeTruthy();
  });
  it('Invalid due to unsafe-hashes in default-src', () => {
    const [valid] = checkCSPForUnsafeInline([
      `default-src 'self' 'unsafe-hashes' 'sha256-xyz789';`,
    ]);
    expect(valid).toBeFalsy();
  });
  it('Invalid due to nonce and unsafe-hashes combined', () => {
    const [valid] = checkCSPForUnsafeInline([
      `script-src 'self' 'nonce-abc123' 'unsafe-hashes' 'sha256-abc123';`,
    ]);
    expect(valid).toBeFalsy();
  });
});
