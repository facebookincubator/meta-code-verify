/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {Origin, ORIGIN_HOST} from '../config';
import {invalidateAndThrow} from './updateCurrentState';
import {parseCSPString} from './parseCSPString';
import {checkCSPForEvals} from './checkCSPForEvals';
import {checkCSPForUnsafeInline} from './checkCSPForUnsafeInline';

export function checkCSPForWorkerSrc(
  cspHeaders: Array<string>,
  origin: Origin,
): [true] | [false, string] {
  const host = ORIGIN_HOST[origin];

  const headersWithWorkerSrc = cspHeaders.filter(cspHeader =>
    parseCSPString(cspHeader).has('worker-src'),
  );

  if (headersWithWorkerSrc.length === 0) {
    return [false, 'Missing worker-src directive on CSP of main document'];
  }

  // Valid CSP if at least one CSP header is strict enough, since the browser
  // should apply all.
  const isValid = headersWithWorkerSrc.some(cspHeader => {
    const cspMap = parseCSPString(cspHeader);
    const workersSrcValues = cspMap.get('worker-src');
    return (
      workersSrcValues &&
      !workersSrcValues.has('data:') &&
      !workersSrcValues.has('blob:') &&
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
    return [true];
  } else {
    return [false, 'Invalid worker-src directive on main document'];
  }
}

export function checkDocumentCSPHeaders(
  cspHeaders: Array<string>,
  cspReportHeaders: Array<string> | undefined,
  origin: Origin,
): void {
  [
    checkCSPForUnsafeInline(cspHeaders),
    checkCSPForEvals(cspHeaders, cspReportHeaders),
    checkCSPForWorkerSrc(cspHeaders, origin),
  ].forEach(([valid, reason]) => {
    if (!valid) {
      invalidateAndThrow(reason);
    }
  });
}

export function getAllowedWorkerCSPs(
  cspHeaders: Array<string>,
): Array<Set<string>> {
  return cspHeaders
    .map(header => parseCSPString(header).get('worker-src'))
    .filter((header): header is Set<string> => !!header);
}
