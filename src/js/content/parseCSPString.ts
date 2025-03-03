/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export function parseCSPString(csp: string): Map<string, Set<string>> {
  const directiveStrings = csp.split(';').filter(Boolean);
  return directiveStrings.reduce((map, directiveString) => {
    const [directive, ...values] = directiveString
      .trim()
      .toLowerCase()
      .split(/\s+/);
    // Ignore subsequent keys for a directive, if it's specified more than once
    if (!map.has(directive)) {
      map.set(directive, new Set(values));
    }
    return map;
  }, new Map());
}
