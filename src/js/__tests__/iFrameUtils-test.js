/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import {isBlankChildFrame} from '../content/iFrameUtils';

describe('isBlankChildFrame', () => {
  it('accepts a nested about:blank document', () => {
    const childWindow = {
      location: {href: 'about:blank'},
      top: {},
    };

    expect(isBlankChildFrame(childWindow)).toBe(true);
  });

  it('accepts a nested about:blank document with a fragment', () => {
    const childWindow = {
      location: {href: 'about:blank#g'},
      top: {},
    };

    expect(isBlankChildFrame(childWindow)).toBe(true);
  });

  it('rejects a top-level about:blank document', () => {
    const topWindow = {
      location: {href: 'about:blank'},
    };
    topWindow.top = topWindow;

    expect(isBlankChildFrame(topWindow)).toBe(false);
  });

  it('rejects a nested non-blank document', () => {
    const childWindow = {
      location: {href: 'https://www.facebook.com/'},
      top: {},
    };

    expect(isBlankChildFrame(childWindow)).toBe(false);
  });
});
