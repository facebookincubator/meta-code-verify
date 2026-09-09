/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {STATES} from '../config';
import alertBackgroundOfImminentFetch from './alertBackgroundOfImminentFetch';
import {
  type CSPCheckResult,
  type CSPPolicies,
  somePolicySatisfiesDirective,
} from './parseCSPString';
import {updateCurrentState} from './updateCurrentState';

let isScanningForCSPEvalReportViolations = false;

function scanForCSPEvalReportViolations(): void {
  if (isScanningForCSPEvalReportViolations) {
    return;
  }
  isScanningForCSPEvalReportViolations = true;

  document.addEventListener('securitypolicyviolation', evt => {
    // Older Browser can't distinguish between 'eval' and 'wasm-eval' violations
    // We need to check if there is an eval violation
    if (evt.blockedURI !== 'eval') {
      return;
    }

    if (evt.disposition === 'enforce') {
      return;
    }

    alertBackgroundOfImminentFetch(evt.sourceFile).then(() => {
      fetch(evt.sourceFile)
        .then(response => response.text())
        .then(code => {
          const violatingLine = code.split(/\r?\n/)[evt.lineNumber - 1];
          if (
            violatingLine.includes('WebAssembly') &&
            !violatingLine.includes('eval(') &&
            !violatingLine.includes('Function(') &&
            !violatingLine.includes("setTimeout('") &&
            !violatingLine.includes("setInterval('") &&
            !violatingLine.includes('setTimeout("') &&
            !violatingLine.includes('setInterval("')
          ) {
            return;
          }
          updateCurrentState(
            STATES.INVALID,
            `Caught eval in ${evt.sourceFile}`,
          );
        });
    });
  });
}

function preventsUnsafeEval(cspPolicies: CSPPolicies): boolean {
  return somePolicySatisfiesDirective(
    cspPolicies,
    ['script-src', 'default-src'],
    values => !values.has("'unsafe-eval'"),
  );
}

export function setUpCSPEvalReportViolationListenerIfNeeded(
  cspPolicies: CSPPolicies,
): void {
  if (!preventsUnsafeEval(cspPolicies)) {
    scanForCSPEvalReportViolations();
  }
}

export function checkCSPForEvals(
  cspPolicies: CSPPolicies,
  cspReportPolicies: CSPPolicies,
): CSPCheckResult {
  // Multiple policies are intersected by the browser, so one policy that
  // prevents unsafe eval is sufficient.
  if (preventsUnsafeEval(cspPolicies)) {
    return {valid: true};
  }

  // If we've gotten this far, this is either invalid or an older browser. We
  // want to execute WASM, but still prevent unsafe-eval.
  // Newer browsers support the wasm-unsafe-eval keyword for this purpose, but
  // for older browsers we need to hack around this.

  // The technique we're using here involves setting report-only headers that
  // match the rules we checked above, but for enforce headers. These will not
  // cause the page to break, but will emit events that we can listen for in
  // scanForCSPEvalReportViolations.

  // Thus, if we've gotten this far and we have no report headers, the page
  // should be considered invalid.
  if (cspReportPolicies.length === 0) {
    return {valid: false, reason: 'Missing CSP report-only header'};
  }

  // If CSP is not reporting on evals, we cannot catch them via event listeners.
  if (!preventsUnsafeEval(cspReportPolicies)) {
    return {
      valid: false,
      reason: 'Missing unsafe-eval from CSP report-only header',
    };
  }

  return {valid: true};
}
