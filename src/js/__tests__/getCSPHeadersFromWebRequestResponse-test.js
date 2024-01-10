/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import {getCSPHeadersFromWebRequestResponse} from '../shared/getCSPHeadersFromWebRequestResponse';

const KEY = 'Content-Security-Policy';

describe('getCSPHeadersFromWebRequestResponse', () => {
  it('Works with single header key, single value', () => {
    expect(
      getCSPHeadersFromWebRequestResponse({
        responseHeaders: [
          {name: KEY, value: 'default-src facebook.com;'},
          {name: 'other-header', value: ''},
        ],
      }),
    ).toEqual([{name: KEY, value: 'default-src facebook.com;'}]);
  });
  it('Works with single header key, multiple values', () => {
    expect(
      getCSPHeadersFromWebRequestResponse({
        responseHeaders: [
          {
            name: KEY,
            value:
              'default-src facebook.com;, frame-ancestors https://www.facebook.com https://www.instagram.com;',
          },
          {name: 'other-header', value: ''},
        ],
      }),
    ).toEqual([
      {name: KEY, value: 'default-src facebook.com;'},
      {
        name: KEY,
        value:
          'frame-ancestors https://www.facebook.com https://www.instagram.com;',
      },
    ]);
  });
  it('It works with multiple header keys', () => {
    expect(
      getCSPHeadersFromWebRequestResponse({
        responseHeaders: [
          {
            name: KEY,
            value: 'default-src facebook.com;',
          },
          {
            name: KEY,
            value:
              'frame-ancestors https://www.facebook.com https://www.instagram.com;',
          },
          {name: 'other-header', value: ''},
        ],
      }),
    ).toEqual([
      {name: KEY, value: 'default-src facebook.com;'},
      {
        name: KEY,
        value:
          'frame-ancestors https://www.facebook.com https://www.instagram.com;',
      },
    ]);
  });
  it('It works with multiple header keys, multiple values', () => {
    expect(
      getCSPHeadersFromWebRequestResponse({
        responseHeaders: [
          {
            name: KEY,
            value: 'script-src facebook.com;',
          },
          {
            name: KEY,
            value:
              'default-src facebook.com;, frame-ancestors https://www.facebook.com https://www.instagram.com;',
          },
          {name: 'other-header', value: ''},
        ],
      }),
    ).toEqual([
      {name: KEY, value: 'script-src facebook.com;'},
      {name: KEY, value: 'default-src facebook.com;'},
      {
        name: KEY,
        value:
          'frame-ancestors https://www.facebook.com https://www.instagram.com;',
      },
    ]);
  });
});
