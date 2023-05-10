/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {MESSAGE_TYPE, STATES} from '../config';
import {updateCurrentState} from './updateCurrentState';
import alertBackgroundOfImminentFetch from './alertBackgroundOfImminentFetch';
import {sendMessageToBackground} from '../shared/sendMessageToBackground';

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
          updateCurrentState(STATES.INVALID);
          sendMessageToBackground({
            type: MESSAGE_TYPE.DEBUG,
            log: `Caught eval in ${e.sourceFile}`,
          });
        });
    });
  });
}

export default function checkCSPHeaders(
  cspHeader: string | undefined,
  cspReportHeader: string | undefined,
) {
  // If CSP is enforcing on evals we don't need to do extra checks
  if (cspHeader != null) {
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

  // If CSP is not reporting on evals we cannot catch them
  if (cspReportHeader != null) {
    const cspReportMap = parseCSPString(cspReportHeader);
    if (cspReportMap.has('script-src')) {
      if (cspReportMap.get('script-src').has("'unsafe-eval'")) {
        updateCurrentState(STATES.INVALID);
        sendMessageToBackground({
          type: MESSAGE_TYPE.DEBUG,
          log: 'Missing unsafe-eval from CSP report-only header',
        });
        return;
      }
    }
    if (!cspReportMap.has('script-src') && cspReportMap.has('default-src')) {
      if (cspReportMap.get('default-src').has("'unsafe-eval'")) {
        updateCurrentState(STATES.INVALID);
        sendMessageToBackground({
          type: MESSAGE_TYPE.DEBUG,
          log: 'Missing unsafe-eval from CSP report-only header',
        });
        return;
      }
    }
  } else {
    sendMessageToBackground({
      type: MESSAGE_TYPE.DEBUG,
      log: 'Missing CSP report-only header',
    });
    updateCurrentState(STATES.INVALID);
    return;
  }

  // Check for evals
  scanForCSPEvalReportViolations();
}
