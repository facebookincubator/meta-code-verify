/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export function asyncThrottle(
  callback: () => Promise<void>,
  waitMilliseconds: number,
): () => void {
  let isExecuting = false;
  let lastCompletionTime: number | null = null;
  let hasPendingInvocation = false;
  let timeoutID: ReturnType<typeof setTimeout> | null = null;

  const invoke = async (): Promise<void> => {
    if (!hasPendingInvocation) {
      return;
    }

    hasPendingInvocation = false;
    timeoutID = null;
    isExecuting = true;

    try {
      await callback();
    } finally {
      isExecuting = false;
      lastCompletionTime = Date.now();
      schedule();
    }
  };

  const schedule = (): void => {
    if (!hasPendingInvocation || isExecuting || timeoutID != null) {
      return;
    }

    if (lastCompletionTime == null) {
      void invoke();
      return;
    }

    const timeUntilNextInvocation =
      waitMilliseconds - (Date.now() - lastCompletionTime);
    if (timeUntilNextInvocation <= 0) {
      void invoke();
    } else {
      timeoutID = setTimeout(() => void invoke(), timeUntilNextInvocation);
    }
  };

  return (): void => {
    hasPendingInvocation = true;
    schedule();
  };
}
