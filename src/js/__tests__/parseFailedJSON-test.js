/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import {jest} from '@jest/globals';
import {STATES} from '../config';
import {setCurrentOrigin} from '../content/updateCurrentState';
import {
  getFailedForTestDoNotUse,
  clearFailedForTestDoNotUse,
  parseFailedJSON,
} from '../content/parseFailedJSON';

jest.useFakeTimers();
describe('parseFailedJSON', () => {
  beforeEach(() => {
    window.chrome.runtime.sendMessage = jest.fn(() => {});
    setCurrentOrigin('FACEBOOK');
    clearFailedForTestDoNotUse();
  });
  it('Should correctly parse valid JSON', () => {
    parseFailedJSON({
      node: {textContent: '{}'},
      retry: 10,
    });
    expect(getFailedForTestDoNotUse()).toBe(null);
  });
  it('Should throw on invalid JSON', () => {
    parseFailedJSON({
      node: {textContent: ''},
      retry: 10,
    });
    setTimeout(() => {
      expect(getFailedForTestDoNotUse()).toBe(true);
    }, 500);
    jest.runAllTimers();
  });
  it('Should eventually success', () => {
    const node = {textContent: ''};
    parseFailedJSON({node, retry: 50});
    setTimeout(() => {
      node.textContent = '{}';
    }, 200);
    jest.runAllTimers();
    console.log(getFailedForTestDoNotUse());
    setTimeout(() => {
      expect(getFailedForTestDoNotUse()).toBe(null);
    }, 200);
    jest.runAllTimers();
  });
});
