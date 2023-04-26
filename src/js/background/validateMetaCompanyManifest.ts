/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export async function validateMetaCompanyManifest(
  rootHash: string,
  otherHashes: {
    combined_hash: string;
    longtail: string;
    main: string;
  },
  leaves: Array<string>
): Promise<boolean> {
  // merge all the hashes into one
  const megaHash = JSON.stringify(leaves);
  // hash it
  const encoder = new TextEncoder();
  const encodedMegaHash = encoder.encode(megaHash);
  const jsHashArray = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', encodedMegaHash))
  );
  const jsHash = jsHashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  // compare to main and long tail, it should match one
  // then hash it with the other
  let combinedHash = '';
  if (jsHash === otherHashes.main || jsHash === otherHashes.longtail) {
    const combinedHashArray = Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          'SHA-256',
          encoder.encode(otherHashes.longtail + otherHashes.main)
        )
      )
    );
    combinedHash = combinedHashArray
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } else {
    return false;
  }

  // ensure result matches root, return.
  console.log('combined hash is ', combinedHash, rootHash);
  return combinedHash === rootHash;
}
