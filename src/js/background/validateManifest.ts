/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const fromHexString = (hexString: string): Uint8Array =>
  new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

const toHexString = (bytes: Uint8Array): string =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');

function getCFHashWorkaroundFunction(
  host: string,
  version: string
): Promise<Response> {
  return new Promise((resolve, reject) => {
    fetch(
      'https://staging-api.privacy-auditability.cloudflare.com/v1/hash/' +
        encodeURIComponent(host) +
        '/' +
        encodeURIComponent(version),
      { method: 'GET' }
    )
      .then(response => {
        resolve(response);
      })
      .catch(response => {
        reject(response);
      });
  });
}

export async function validateManifest(
  rootHash: string,
  leaves: Array<string>,
  host: string,
  version: string,
  workaround: string
): Promise<{ valid: boolean; reason?: string }> {
  // does rootHash match what was published?
  const cfResponse = await getCFHashWorkaroundFunction(host, version).catch(
    cfError => {
      console.log('error fetching hash from CF', cfError);
      return {
        valid: false,
        reason: 'ENDPOINT_FAILURE',
        error: cfError,
      };
    }
  );
  if (cfResponse == null || !('json' in cfResponse)) {
    return {
      valid: false,
      reason: 'UNKNOWN_ENDPOINT_ISSUE',
    };
  }
  const cfPayload = await cfResponse.json();
  let cfRootHash = cfPayload.root_hash;
  if (cfPayload.root_hash.startsWith('0x')) {
    cfRootHash = cfPayload.root_hash.slice(2);
  }
  // validate
  if (rootHash !== cfRootHash) {
    console.log('hash mismatch with CF ', rootHash, cfRootHash);

    // secondary hash to mitigate accidental build issue.
    const encoder = new TextEncoder();
    const backupHashEncoded = encoder.encode(workaround);
    const backupHashArray = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', backupHashEncoded))
    );
    const backupHash = backupHashArray
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    console.log(
      'secondary hashing of CF value fails too ',
      rootHash,
      backupHash
    );
    if (backupHash !== cfRootHash) {
      return {
        valid: false,
        reason: 'ROOT_HASH_VERFIY_FAIL_3RD_PARTY',
      };
    }
  }

  let oldhashes = leaves.map(
    leaf => fromHexString(leaf.replace('0x', '')).buffer
  );
  let newhashes = [];
  let bonus: ArrayBufferLike = null;

  while (oldhashes.length > 1) {
    for (let index = 0; index < oldhashes.length; index += 2) {
      const validSecondValue = index + 1 < oldhashes.length;
      if (validSecondValue) {
        const hashValue = new Uint8Array(
          oldhashes[index].byteLength + oldhashes[index + 1].byteLength
        );
        hashValue.set(new Uint8Array(oldhashes[index]), 0);
        hashValue.set(
          new Uint8Array(oldhashes[index + 1]),
          oldhashes[index].byteLength
        );
        newhashes.push(await crypto.subtle.digest('SHA-256', hashValue.buffer));
      } else {
        bonus = oldhashes[index];
      }
    }
    oldhashes = newhashes;
    if (bonus !== null) {
      oldhashes.push(bonus);
    }
    console.log(
      'layer hex is ',
      oldhashes.map(hash => {
        return Array.from(new Uint8Array(hash))
          .map(b => b.toString(16).padStart(2, ''))
          .join('');
      })
    );
    newhashes = [];
    bonus = null;
    console.log(
      'in loop hashes.length is',
      oldhashes.length,
      rootHash,
      oldhashes
    );
  }
  const lastHash = toHexString(new Uint8Array(oldhashes[0]));
  console.log('before return comparison', rootHash, lastHash);
  if (lastHash === rootHash) {
    return {
      valid: true,
    };
  }
  return {
    valid: false,
    reason: 'ROOT_HASH_VERFIY_FAIL_IN_PAGE',
  };
}
