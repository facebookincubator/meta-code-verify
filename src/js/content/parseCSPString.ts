/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export function parseCSPString(csp: string): Map<string, Set<string>> {
  const directiveStrings = csp.split(';');
  return directiveStrings.reduce((map, directiveString) => {
    const [directive, ...values] = directiveString.toLowerCase().split(' ');
    return map.set(directive, new Set(values));
  }, new Map());
}
