/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

type CSPPolicy = Map<string, Set<string>>;
export type CSPPolicies = Array<CSPPolicy>;
export type CSPCheckResult = {valid: true} | {valid: false; reason: string};

export function parseCSPHeaders(cspHeaders: Array<string>): CSPPolicies {
  return cspHeaders.map(csp =>
    csp.split(';').reduce((policy, directiveString) => {
      const [directive, ...values] = directiveString
        .trim()
        .toLowerCase()
        .split(/\s+/);
      // Ignore subsequent keys for a directive, if it's specified more than once
      if (directive && !policy.has(directive)) {
        policy.set(directive, new Set(values));
      }
      return policy;
    }, new Map<string, Set<string>>()),
  );
}

export function somePolicySatisfiesDirective(
  policies: CSPPolicies,
  directiveNames: ReadonlyArray<string>,
  predicate: (values: Set<string>) => boolean,
): boolean {
  return policies.some(policy => {
    for (const directiveName of directiveNames) {
      const values = policy.get(directiveName);
      if (values) {
        return predicate(values);
      }
    }
    return false;
  });
}
