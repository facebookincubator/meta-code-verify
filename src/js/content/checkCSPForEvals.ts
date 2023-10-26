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
  cspReportHeaders: Array<string> | undefined,
): boolean {
  const [hasValidScriptSrcEnforcement, hasScriptSrcDirectiveForEnforce] =
    getIsValidScriptSrcAndHasScriptSrcDirective(cspHeaders);

  // 1. This means that at least one CSP-header declaration has a script-src
  // directive that has no `unsafe-eval` keyword. This means the browser will
  // enforce unsafe eval for us.
  if (hasValidScriptSrcEnforcement) {
    return true;
  }

  // 2. If we have no script-src directives, the browser will fall back to
  // default-src. If at least one declaration has a default-src directive
  // with no `unsafe-eval`, the browser will enforce for us.
  if (!hasScriptSrcDirectiveForEnforce) {
    if (getIsValidDefaultSrc(cspHeaders)) {
      return true;
    }
  }

  // If we've gotten this far, it either means something is invalid, or this is
  // an older browser. We want to execute WASM, but still prevent unsafe-eval.
  // Newer browsers support the wasm-unsafe-eval keyword for this purpose, but
  // for older browsers we need to hack around this.

  // The technique we're using here involves setting report-only headers that
  // match the rules we checked above, but for enforce headers. These will not
  // cause the page to break, but will emit events that we can listen for in
  // scanForCSPEvalReportViolations.

  // 3. Thus, if we've gotten this far and we have no report headers, the page
  // should be considered invalid.
  if (!cspReportHeaders || cspReportHeaders.length === 0) {
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

  // 4. If neither
  //  a. We have at least one script-src without unsafe eval.
  //  b. We have no script-src, and at least one default-src without unsafe-eval
  // Then we must invalidate because there is nothing preventing unsafe-eval.
  if (!hasValidScriptSrcReport && !hasValidDefaultSrcReport) {
    updateCurrentState(
      STATES.INVALID,
      'Missing unsafe-eval from CSP report-only header',
    );
    return false;
  }

  // 5. If we've gotten here without throwing, we can start scanning for violations
  // from our report-only headers.
  scanForCSPEvalReportViolations();
  return true;
}
