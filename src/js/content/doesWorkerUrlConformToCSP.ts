/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export function doesWorkerUrlConformToCSP(
  workerValues: Set<string>,
  url: string,
): boolean {
  // https://www.w3.org/TR/CSP3/#match-paths

  // *.facebook.com/sw/ -> does not exactMatch
  // *.facebook.com/sw -> needs exact match

  for (const value of workerValues) {
    const exactMatch = !value.endsWith('/');
    // Allowed query parameters for exact match, and everything for non exact match
    const regexEnd = exactMatch ? '(\\?*)?$' : '*$';
    const regex = new RegExp(('^' + value + regexEnd).replaceAll('*', '.*'));
    if (regex.test(url)) {
      return true;
    }
  }
  return false;
}
