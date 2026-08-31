/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {parseCSPString} from './parseCSPString';

function rejectUnsafeHeaders(values: Set<string>): boolean {
  if (values.has(`'unsafe-inline'`)) {
    return false;
  }
  return true;
}

/**
 * Enforces that CSP headers do not allow unsafe-inline script elements.
 * script-src-elem falls back to script-src, then default-src.
 */
export function checkCSPForUnsafeInline(
  cspHeaders: Array<string>,
): [true] | [false, string] {
  const preventsUnsafeInline = cspHeaders.some(cspHeader => {
    const headers = parseCSPString(cspHeader);
    const effectiveScriptSources =
      headers.get('script-src-elem') ??
      headers.get('script-src') ??
      headers.get('default-src');

    return (
      effectiveScriptSources != null &&
      rejectUnsafeHeaders(effectiveScriptSources)
    );
  });

  if (preventsUnsafeInline) {
    return [true];
  } else {
    return [false, 'CSP Headers do not prevent unsafe-inline.'];
  }
}
