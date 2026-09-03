/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export function isTopWindow(): boolean {
  return window == window.top;
}

export function isBlankChildFrame(targetWindow: Window = window): boolean {
  const href = targetWindow.location.href;
  return (
    targetWindow !== targetWindow.top &&
    (href === 'about:blank' || href.startsWith('about:blank#'))
  );
}

export function isSameDomainAsTopWindow(): boolean {
  try {
    // This is inside a try/catch because even attempting to access the `origin`
    // property will throw a SecurityError if the domains don't match.
    return window.location.origin === window.top?.location.origin;
  } catch {
    return false;
  }
}
