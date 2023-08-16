/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export function getCFRootHash(
  host: string,
  version: string,
): Promise<Response | null> {
  return new Promise(resolve => {
    fetch(
      'https://staging-api.privacy-auditability.cloudflare.com/v1/hash/' +
        `${encodeURIComponent(host)}/${encodeURIComponent(version)}`,
      {method: 'GET'},
    )
      .then(response => {
        resolve(response);
      })
      .catch(error => {
        console.error('error fetching hash from CF', error);
        resolve(null);
      });
  });
}
