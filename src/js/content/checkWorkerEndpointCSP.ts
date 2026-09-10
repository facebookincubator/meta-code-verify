/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {Origin, ORIGIN_HOST} from '../config';
import getCSPHeadersFromWebRequestResponse from '../shared/getCSPHeadersFromWebRequestResponse';
import {
  checkCSPForEvals,
  setUpCSPEvalReportViolationListenerIfNeeded,
} from './checkCSPForEvals';
import doesWorkerUrlConformToCSP from './doesWorkerUrlConformToCSP';
import {
  type CSPCheckResult,
  type CSPPolicies,
  parseCSPHeaders,
  somePolicySatisfiesDirective,
} from './parseCSPString';
import {invalidateAndThrow} from './updateCurrentState';

type WorkerEndpointCSPValidation = {
  cspPolicies: CSPPolicies;
  result: CSPCheckResult;
};

/**
 * Dedicated Workers can nest workers, we need to check their CSPs.
 *
 * worker-src CSP inside a worker should conform to atleast
 * one of the worker-src CSPs on the main document which
 * have already been validated, otherwise worker can spin
 * up arbitrary workers or blob:/data:.
 */
function isWorkerSrcValid(
  cspPolicies: CSPPolicies,
  host: string,
  documentWorkerCSPs: Set<string>[],
): boolean {
  return cspPolicies.some(policy => {
    const allowedWorkers = policy.get('worker-src');
    if (!allowedWorkers) {
      return false;
    }
    /**
     * Filter out worker-src that aren't same origin because of the bug below
     * This is safe to do since workers MUST be same-origin by definition
     * https://bugzilla.mozilla.org/show_bug.cgi?id=1847548&fbclid=IwAR3qIyYr5K92_Cw3UJmgtSbgBKwZ5bLppP6LNwN6lC-kQVEdxr_52zeQUPE
     */
    const allowedWorkersToCheck = Array.from(allowedWorkers.values()).filter(
      worker => worker.includes('.' + host) || worker.startsWith(host),
    );

    return documentWorkerCSPs.some(documentWorkerValues => {
      return allowedWorkersToCheck.every(
        workerSrcValue =>
          doesWorkerUrlConformToCSP(documentWorkerValues, workerSrcValue) ||
          documentWorkerValues.has(workerSrcValue),
      );
    });
  });
}

/**
 * Check script-src for blob: data:
 * Workers can call importScripts/import on arbitrary strings.
 * This CSP should be in place to prevent that.
 */
function areBlobAndDataExcluded(cspPolicies: CSPPolicies): boolean {
  return somePolicySatisfiesDirective(
    cspPolicies,
    ['script-src', 'default-src'],
    cspValues => !cspValues.has('blob:') && !cspValues.has('data:'),
  );
}

/**
 * This function should not have side-effects (no throw, no invalidation).
 * See checkWorkerEndpointCSP for enforcement.
 */
function validateWorkerEndpointCSP(
  response: chrome.webRequest.OnResponseStartedDetails,
  documentWorkerCSPs: Array<Set<string>>,
  origin: Origin,
): WorkerEndpointCSPValidation {
  const host = ORIGIN_HOST[origin];
  const cspPolicies = parseCSPHeaders(
    getCSPHeadersFromWebRequestResponse(response).flatMap(header =>
      header.value ? [header.value] : [],
    ),
  );
  const cspReportPolicies = parseCSPHeaders(
    getCSPHeadersFromWebRequestResponse(response, true).flatMap(header =>
      header.value ? [header.value] : [],
    ),
  );

  const evalResult = checkCSPForEvals(cspPolicies, cspReportPolicies);
  if (!evalResult.valid) {
    return {cspPolicies, result: evalResult};
  }

  if (!isWorkerSrcValid(cspPolicies, host, documentWorkerCSPs)) {
    return {
      cspPolicies,
      result: {
        valid: false,
        reason: 'Nested worker-src does not conform to document worker-src CSP',
      },
    };
  }

  if (!areBlobAndDataExcluded(cspPolicies)) {
    return {
      cspPolicies,
      result: {
        valid: false,
        reason: 'Worker allows blob:/data: importScripts/import',
      },
    };
  }

  return {cspPolicies, result: {valid: true}};
}

export function isWorkerEndpointCSPValid(
  response: chrome.webRequest.OnResponseStartedDetails,
  documentWorkerCSPs: Array<Set<string>>,
  origin: Origin,
): CSPCheckResult {
  return validateWorkerEndpointCSP(response, documentWorkerCSPs, origin).result;
}

export function checkWorkerEndpointCSP(
  response: chrome.webRequest.OnResponseStartedDetails,
  documentWorkerCSPs: Array<Set<string>>,
  origin: Origin,
): void {
  const {cspPolicies, result} = validateWorkerEndpointCSP(
    response,
    documentWorkerCSPs,
    origin,
  );
  if (!result.valid) {
    invalidateAndThrow(result.reason);
  }
  setUpCSPEvalReportViolationListenerIfNeeded(cspPolicies);
}
