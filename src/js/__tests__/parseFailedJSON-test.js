/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import {jest} from '@jest/globals';
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
    const onSuccess = jest.fn();
    parseFailedJSON({textContent: '{}'}, 10, onSuccess);
    expect(getFailedForTestDoNotUse()).toBe(null);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
  it('Should not retry when the success callback throws', () => {
    const onSuccess = jest.fn(() => {
      throw new Error('Callback failed');
    });

    expect(() => parseFailedJSON({textContent: '{}'}, 10, onSuccess)).toThrow(
      'Callback failed',
    );
    jest.runAllTimers();
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
  it('Should throw on invalid JSON', () => {
    parseFailedJSON({textContent: ''}, 10);
    setTimeout(() => {
      expect(getFailedForTestDoNotUse()).toBe(true);
    }, 500);
    jest.runAllTimers();
  });
  it('Should eventually success', () => {
    const node = {textContent: ''};
    const onSuccess = jest.fn();
    parseFailedJSON(node, 50, onSuccess);
    setTimeout(() => {
      node.textContent = '{}';
    }, 200);
    jest.runAllTimers();
    setTimeout(() => {
      expect(getFailedForTestDoNotUse()).toBe(null);
      expect(onSuccess).toHaveBeenCalledTimes(1);
    }, 200);
    jest.runAllTimers();
  });
});
