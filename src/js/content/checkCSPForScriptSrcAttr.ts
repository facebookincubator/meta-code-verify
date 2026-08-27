/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {parseCSPString} from './parseCSPString';

function isHashSource(value: string): boolean {
  return /^'sha(?:256|384|512)-/.test(value);
}

function allowsUnverifiedScriptAttributes(values: Set<string>): boolean {
  if (values.has(`'unsafe-inline'`)) {
    return true;
  }

  return (
    values.has(`'unsafe-hashes'`) &&
    // N.B. unsafe-hashes is technically benign when no an actual hash specified
    Array.from(values.values()).some(isHashSource)
  );
}

/**
 * Enforces that inline event-handler attributes cannot execute unverified
 * JavaScript. script-src-attr falls back to script-src, then default-src.
 */
export function checkCSPForScriptSrcAttr(
  cspHeaders: Array<string>,
): [true] | [false, string] {
  // Multiple enforced CSP policies are intersected by the browser, so one
  // policy that blocks script attributes is sufficient.
  const preventsUnverifiedScriptAttributes = cspHeaders.some(cspHeader => {
    const headers = parseCSPString(cspHeader);
    const effectiveScriptAttrSources =
      headers.get('script-src-attr') ??
      headers.get('script-src') ??
      headers.get('default-src');

    return (
      effectiveScriptAttrSources != null &&
      !allowsUnverifiedScriptAttributes(effectiveScriptAttrSources)
    );
  });

  if (preventsUnverifiedScriptAttributes) {
    return [true];
  } else {
    return [false, 'CSP Headers allow unverified script attributes.'];
  }
}
