/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import {jest} from '@jest/globals';
import {asyncThrottle} from '../shared/asyncThrottle';

describe('asyncThrottle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('invokes immediately and limits subsequent calls', async () => {
    const callback = jest.fn(async () => {});
    const throttledCallback = asyncThrottle(callback, 100);

    throttledCallback();
    throttledCallback();
    throttledCallback();

    expect(callback).toHaveBeenCalledTimes(1);

    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(100);

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('invokes immediately again after the throttle period', async () => {
    const callback = jest.fn(async () => {});
    const throttledCallback = asyncThrottle(callback, 100);

    throttledCallback();
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(100);
    throttledCallback();

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('waits for async callbacks to complete before starting another', async () => {
    let activeCalls = 0;
    let callbackInvocations = 0;
    let maximumActiveCalls = 0;
    let resolveFirstCall;
    const firstCallCompletion = new Promise(resolve => {
      resolveFirstCall = resolve;
    });
    const callback = jest.fn(async () => {
      callbackInvocations++;
      activeCalls++;
      maximumActiveCalls = Math.max(maximumActiveCalls, activeCalls);
      if (callbackInvocations === 1) {
        await firstCallCompletion;
      }
      activeCalls--;
    });
    const throttledCallback = asyncThrottle(callback, 100);

    throttledCallback();
    throttledCallback();
    await jest.advanceTimersByTimeAsync(1000);

    expect(callback).toHaveBeenCalledTimes(1);
    resolveFirstCall();
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(99);
    expect(callback).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1);
    expect(callback).toHaveBeenCalledTimes(2);
    expect(maximumActiveCalls).toBe(1);
  });
});
