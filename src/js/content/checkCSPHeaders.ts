/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {STATES} from '../config';
import {updateCurrentState} from './updateCurrentState';
import alertBackgroundOfImminentFetch from './alertBackgroundOfImminentFetch';

function parseCSPString(csp: string): Map<string, Set<string>> {
  const directiveStrings = csp.split(';');
  return directiveStrings.reduce((map, directiveString) => {
    const [directive, ...values] = directiveString.split(' ');
    return map.set(directive, new Set(values));
  }, new Map());
}

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

export default function checkCSPHeaders(
  cspHeaders: Array<string>,
  cspReportHeaders: Array<string>,
) {
  for (const cspHeader of cspHeaders) {
    // If CSP is enforcing on evals we don't need to do extra checks
    const cspMap = parseCSPString(cspHeader);
    if (cspMap.has('script-src')) {
      if (!cspMap.get('script-src').has("'unsafe-eval'")) {
        return;
      }
    }
    if (!cspMap.has('script-src') && cspMap.has('default-src')) {
      if (!cspMap.get('default-src').has("'unsafe-eval'")) {
        return;
      }
    }
  }

  if (cspReportHeaders.length === 0) {
    updateCurrentState(STATES.INVALID, 'Missing CSP report-only header');
    return;
  }

  // Check if at least one header has the correct report setup
  const hasValidReportHeader = cspReportHeaders.some(cspReportHeader => {
    // If CSP is not reporting on evals we cannot catch them via event listeners
    const cspReportMap = parseCSPString(cspReportHeader);
    if (cspReportMap.has('script-src')) {
      if (cspReportMap.get('script-src').has("'unsafe-eval'")) {
        return false;
      }
    }
    if (!cspReportMap.has('script-src') && cspReportMap.has('default-src')) {
      if (cspReportMap.get('default-src').has("'unsafe-eval'")) {
        return false;
      }
    }
    return true;
  });

  if (!hasValidReportHeader) {
    updateCurrentState(
      STATES.INVALID,
      'Missing unsafe-eval from CSP report-only header',
    );
    return;
  }
  // Check for evals
  scanForCSPEvalReportViolations();
}
