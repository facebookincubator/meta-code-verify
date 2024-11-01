/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {MANIFEST_TIMEOUT, STATES} from '../config';
import {updateCurrentState} from './updateCurrentState';

export default function ensureManifestWasOrWillBeLoaded(
  loadedVersions: Set<string>,
  version: string,
) {
  if (loadedVersions.has(version)) {
    return;
  }
  setTimeout(() => {
    if (!loadedVersions.has(version)) {
      updateCurrentState(
        STATES.INVALID,
        `Detected script from manifest version ${version} that has not been loaded`,
      );
    }
  }, MANIFEST_TIMEOUT);
}
