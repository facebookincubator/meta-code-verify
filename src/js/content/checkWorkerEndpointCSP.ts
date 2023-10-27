/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {Origin, ORIGIN_HOST} from '../config';
import {getCSPHeadersFromWebRequestResponse} from '../shared/getCSPHeadersFromWebRequestResponse';
import {checkCSPForEvals} from './checkCSPForEvals';
import {doesWorkerUrlConformToCSP} from './doesWorkerUrlConformToCSP';
import {parseCSPString} from './parseCSPString';
import {invalidateAndThrow} from './updateCurrentState';

/**
 * Dedicated Workers can nest workers, we need to check their CSPs.
 *
 * worker-src CSP inside a worker should conform to atleast
 * one of the worker-src CSPs on the main document which
 * have already been validated, otherwise worker can spin
 * up arbitrary workers or blob:/data:.
 */
export function isWorkerSrcValid(
  cspHeaders: string[],
  host: string,
  documentWorkerCSPs: Set<string>[],
): boolean {
  return cspHeaders.some(header => {
    const allowedWorkers = parseCSPString(header).get('worker-src');

    if (allowedWorkers) {
      /**
       * Filter out worker-src that aren't same origin because of the bellow bug
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
    }
    return false;
  });
}

/**
 * Check script-src for blob: data:
 * Workers can call importScripts/import on arbitrary strings.
 * This CSP should be in place to prevent that.
 */
export function areBlobAndDataExcluded(cspHeaders: string[]): boolean {
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

  return false;
}

/**
 * This function should not have side-effects (no throw, no invalidation).
 * See checkWorkerEndpointCSP for enforcement.
 */
export function isWorkerEndpointCSPValid(
  response: chrome.webRequest.WebResponseCacheDetails,
  documentWorkerCSPs: Array<Set<string>>,
  origin: Origin,
): [true] | [false, string] {
  const host = ORIGIN_HOST[origin];
  const cspHeaders = getCSPHeadersFromWebRequestResponse(response)
    .map(h => h.value)
    .filter((header): header is string => !!header);

  const cspReportHeaders = getCSPHeadersFromWebRequestResponse(response, true)
    .map(h => h.value)
    .filter((header): header is string => !!header);

  const [evalIsValid, reason] = checkCSPForEvals(cspHeaders, cspReportHeaders);
  if (!evalIsValid) {
    return [false, reason];
  }

  if (!isWorkerSrcValid(cspHeaders, host, documentWorkerCSPs)) {
    return [
      false,
      'Nested worker-src does not conform to document worker-src CSP',
    ];
  }

  if (!areBlobAndDataExcluded(cspHeaders)) {
    return [false, 'Worker allows blob:/data: importScripts/import'];
  }

  return [true];
}

export function checkWorkerEndpointCSP(
  response: chrome.webRequest.WebResponseCacheDetails,
  documentWorkerCSPs: Array<Set<string>>,
  origin: Origin,
): void {
  const [valid, reason] = isWorkerEndpointCSPValid(
    response,
    documentWorkerCSPs,
    origin,
  );
  if (!valid) {
    invalidateAndThrow(reason);
  }
}

function cspValuesExcludeBlobAndData(cspValues: Set<string>): boolean {
  return !cspValues.has('blob:') && !cspValues.has('data:');
}

function getIsValidDefaultSrc(cspHeaders: Array<string>): boolean {
  return cspHeaders.some(cspHeader => {
    const cspMap = parseCSPString(cspHeader);
    const defaultSrc = cspMap.get('default-src');
    if (!cspMap.has('script-src') && defaultSrc) {
      if (cspValuesExcludeBlobAndData(defaultSrc)) {
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
      if (cspValuesExcludeBlobAndData(scriptSrc)) {
        return true;
      }
    }
    return false;
  });
  return [isValidScriptSrc, hasScriptSrcDirective];
}
