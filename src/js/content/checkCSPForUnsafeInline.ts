/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {parseCSPString} from './parseCSPString';

/**
 * Enforces that CSP headers do not allow unsafe-inline
 */
export function checkCSPForUnsafeInline(
  cspHeaders: Array<string>,
): [true] | [false, string] {
  const preventsUnsafeInline = cspHeaders.some(cspHeader => {
    const headers = parseCSPString(cspHeader);

    const scriptSrc = headers.get('script-src');
    if (scriptSrc) {
      return !scriptSrc.has(`'unsafe-inline'`);
    }

    const defaultSrc = headers.get('default-src');
    if (defaultSrc) {
      return !defaultSrc.has(`'unsafe-inline'`);
    }

    return false;
  });

  if (preventsUnsafeInline) {
    return [true];
  } else {
    return [false, 'CSP Headers do not prevent unsafe-inline.'];
  }
}
