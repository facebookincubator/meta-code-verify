/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {STATES} from '../config';
import alertBackgroundOfImminentFetch from './alertBackgroundOfImminentFetch';
import {parseCSPString} from './parseCSPString';
import {updateCurrentState} from './updateCurrentState';

function scanForCSPEvalReportViolations(): void {
  document.addEventListener('securitypolicyviolation', e => {
    // Older Browser can't distinguish between 'eval' and 'wasm-eval' violations
    // We need to check if there is an eval violation
    if (e.blockedURI !== 'eval') {
      return;
    }

    if (e.disposition === 'enforce') {
      return;
    }

    alertBackgroundOfImminentFetch(e.sourceFile).then(() => {
      fetch(e.sourceFile)
        .then(response => response.text())
        .then(code => {
          const violatingLine = code.split(/\r?\n/)[e.lineNumber - 1];
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
          updateCurrentState(STATES.INVALID, `Caught eval in ${e.sourceFile}`);
        });
    });
  });
}

function getIsValidDefaultSrc(cspHeaders: Array<string>): boolean {
  return cspHeaders.some(cspHeader => {
    const cspMap = parseCSPString(cspHeader);
    const defaultSrc = cspMap.get('default-src');
    const scriptSrc = cspMap.get('script-src');
    if (!scriptSrc && defaultSrc) {
      if (!defaultSrc.has("'unsafe-eval'")) {
        return true;
      }
    }
    return false;
  });
}

function getIsValidScriptSrcAndHasScriptSrcDirective(
  cspHeaders: Array<string>,
): [boolean, boolean] {
  let hasScriptSrcDirective = false;
  const isValidScriptSrc = cspHeaders.some(cspHeader => {
    const cspMap = parseCSPString(cspHeader);
    const scriptSrc = cspMap.get('script-src');
    if (scriptSrc) {
      hasScriptSrcDirective = true;
      if (!scriptSrc.has("'unsafe-eval'")) {
        return true;
      }
    }
    return false;
  });
  return [isValidScriptSrc, hasScriptSrcDirective];
}

export function checkCSPForEvals(
  cspHeaders: Array<string>,
  cspReportHeaders: Array<string>,
): boolean {
  // If CSP is enforcing on evals we don't need to do extra checks

  // Check `script-src` across all headers first since it takes precedence
  // across multiple headers
  const [hasValidScriptSrcEnforcement, hasScriptSrcDirectiveForEnforce] =
    getIsValidScriptSrcAndHasScriptSrcDirective(cspHeaders);
  if (hasValidScriptSrcEnforcement) {
    return true;
  }

  if (!hasScriptSrcDirectiveForEnforce) {
    if (getIsValidDefaultSrc(cspHeaders)) {
      return true;
    }
  }

  if (cspReportHeaders.length === 0) {
    updateCurrentState(STATES.INVALID, 'Missing CSP report-only header');
    return false;
  }

  // Check if at least one header has the correct report setup
  // If CSP is not reporting on evals we cannot catch them via event listeners
  const [hasValidScriptSrcReport, hasScriptSrcDirectiveForReport] =
    getIsValidScriptSrcAndHasScriptSrcDirective(cspReportHeaders);

  let hasValidDefaultSrcReport = false;
  if (!hasScriptSrcDirectiveForReport) {
    hasValidDefaultSrcReport = getIsValidDefaultSrc(cspReportHeaders);
  }

  if (!hasValidScriptSrcReport && !hasValidDefaultSrcReport) {
    updateCurrentState(
      STATES.INVALID,
      'Missing unsafe-eval from CSP report-only header',
    );
    return false;
  }
  // Check for evals
  scanForCSPEvalReportViolations();
  return true;
}
