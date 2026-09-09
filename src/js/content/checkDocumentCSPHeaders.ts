/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {Origin, ORIGIN_HOST} from '../config';
import {invalidateAndThrow} from './updateCurrentState';
import {
  checkCSPForEvals,
  setUpCSPEvalReportViolationListenerIfNeeded,
} from './checkCSPForEvals';
import {
  type CSPCheckResult,
  type CSPPolicies,
  parseCSPHeaders,
  somePolicySatisfiesDirective,
} from './parseCSPString';

function isHashSource(value: string): boolean {
  return /^'sha(?:256|384|512)-/.test(value);
}

function allowsUnverifiedScriptAttributes(values: Set<string>): boolean {
  return (
    values.has(`'unsafe-inline'`) ||
    (values.has(`'unsafe-hashes'`) &&
      // unsafe-hashes is benign when no hash is specified.
      Array.from(values).some(isHashSource))
  );
}

// Enforces that inline script elements cannot execute unverified code.
export function checkCSPForUnsafeInline(
  cspPolicies: CSPPolicies,
): CSPCheckResult {
  const preventsUnsafeInline = somePolicySatisfiesDirective(
    cspPolicies,
    ['script-src-elem', 'script-src', 'default-src'],
    values => !values.has(`'unsafe-inline'`),
  );

  return preventsUnsafeInline
    ? {valid: true}
    : {valid: false, reason: 'CSP Headers do not prevent unsafe-inline.'};
}

// Enforces that inline event-handler attributes cannot execute unverified code.
export function checkCSPForScriptSrcAttr(
  cspPolicies: CSPPolicies,
): CSPCheckResult {
  const preventsUnverifiedScriptAttributes = somePolicySatisfiesDirective(
    cspPolicies,
    ['script-src-attr', 'script-src', 'default-src'],
    values => !allowsUnverifiedScriptAttributes(values),
  );

  return preventsUnverifiedScriptAttributes
    ? {valid: true}
    : {
        valid: false,
        reason: 'CSP Headers allow unverified script attributes.',
      };
}

export function checkCSPForWorkerSrc(
  cspPolicies: CSPPolicies,
  origin: Origin,
): CSPCheckResult {
  const host = ORIGIN_HOST[origin];

  const policiesWithWorkerSrc = cspPolicies.filter(policy =>
    policy.has('worker-src'),
  );

  if (policiesWithWorkerSrc.length === 0) {
    return {
      valid: false,
      reason: 'Missing worker-src directive on CSP of main document',
    };
  }

  // Valid CSP if at least one CSP header is strict enough, since the browser
  // should apply all.
  const isValid = policiesWithWorkerSrc.some(policy => {
    const workersSrcValues = policy.get('worker-src');
    return (
      workersSrcValues != null &&
      !workersSrcValues.has('data:') &&
      !workersSrcValues.has('blob:') &&
      !workersSrcValues.has("'self'") &&
      /**
       * Ensure that worker-src doesn't have values like *.facebook.com
       * this would require us to assume that every non main-thread script
       * from this origin might be a worker setting us for potential breakages
       * in the future. Instead worker-src should be a finite list of urls,
       * which if fetched will be ensured to have valid CSPs within them,
       * since url backed workers have independent CSP.
       */
      !Array.from(workersSrcValues.values()).some(
        value => value.endsWith(host) || value.endsWith(host + '/'),
      )
    );
  });

  if (isValid) {
    return {valid: true};
  } else {
    return {
      valid: false,
      reason: 'Invalid worker-src directive on main document',
    };
  }
}

export function checkDocumentCSPHeaders(
  cspHeaders: Array<string>,
  cspReportHeaders: Array<string> | undefined,
  origin: Origin,
): Array<Set<string>> {
  const cspPolicies = parseCSPHeaders(cspHeaders);
  const cspReportPolicies = parseCSPHeaders(cspReportHeaders ?? []);
  const checks: Array<() => CSPCheckResult> = [
    () => checkCSPForUnsafeInline(cspPolicies),
    () => checkCSPForScriptSrcAttr(cspPolicies),
    () => checkCSPForEvals(cspPolicies, cspReportPolicies),
    () => checkCSPForWorkerSrc(cspPolicies, origin),
  ];

  for (const check of checks) {
    const result = check();
    if (!result.valid) {
      invalidateAndThrow(result.reason);
    }
  }

  setUpCSPEvalReportViolationListenerIfNeeded(cspPolicies);

  return cspPolicies
    .map(policy => policy.get('worker-src'))
    .filter((values): values is Set<string> => values != null);
}
