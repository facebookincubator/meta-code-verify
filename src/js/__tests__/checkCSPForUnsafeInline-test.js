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
});
