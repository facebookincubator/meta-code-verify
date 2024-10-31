/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {invalidateAndThrow} from './updateCurrentState';

export const BOTH = 'BOTH';

export function getManifestVersionAndTypeFromNode(
  element: HTMLElement,
): [string, string] {
  const versionAndType = tryToGetManifestVersionAndTypeFromNode(element);

  if (!versionAndType) {
    invalidateAndThrow(
      `Missing manifest data attribute or invalid version/typeon attribute`,
    );
  }

  return versionAndType;
}

export function tryToGetManifestVersionAndTypeFromNode(
  element: HTMLElement,
): [string, string] | null {
  const dataBtManifest = element.getAttribute('data-btmanifest');
  if (dataBtManifest == null) {
    return null;
  }

  // Scripts may contain packages from both main and longtail manifests,
  // e.g. "1009592080_main,1009592080_longtail"
  const [manifest1, manifest2] = dataBtManifest.split(',');

  // If this scripts contains packages from both main and longtail manifests
  // then require both manifests to be loaded before processing this script,
  // otherwise use the single type specified.
  const otherType = manifest2 ? BOTH : manifest1.split('_')[1];

  // It is safe to assume a script will not contain packages from different
  // versions, so we can use the first manifest version as the script version.
  const version = manifest1.split('_')[0];

  if (!version || !otherType) {
    return null;
  }

  return [version, otherType];
}
