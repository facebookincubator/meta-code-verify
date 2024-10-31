/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {TagDetails} from '../content';

export function getTagIdentifier(tagDetails: TagDetails): string {
  switch (tagDetails.type) {
    case 'script':
      return tagDetails.src;
    case 'link':
      return tagDetails.href;
    case 'style':
      return 'style_' + tagDetails.tag.innerHTML.substring(0, 100);
  }
}
