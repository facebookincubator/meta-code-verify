/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

type CSPPolicy = Map<string, Set<string>>;
export type CSPPolicies = Array<CSPPolicy>;
export type CSPCheckResult = {valid: true} | {valid: false; reason: string};

function isASCIIString(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) > 0x7f) {
      return false;
    }
  }
  return true;
}

export function parseCSPHeaders(cspHeaders: Array<string>): CSPPolicies {
  return cspHeaders.map(csp =>
    csp.split(';').reduce((policy, directiveString) => {
      // CSP only recognizes ASCII whitespace in serialized directives.
      // trim() and \s would also accept Unicode whitespace, which could make us
      // recognize a directive that the browser ignores.
      const directiveToken = directiveString.replace(
        /^[\t\n\f\r ]+|[\t\n\f\r ]+$/g,
        '',
      );
      if (!directiveToken || !isASCIIString(directiveToken)) {
        return policy;
      }
      const [directive, ...values] = directiveToken
        .toLowerCase()
        .split(/[\t\n\f\r ]+/);
      // Ignore subsequent keys for a directive, if it's specified more than once
      if (!policy.has(directive)) {
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
