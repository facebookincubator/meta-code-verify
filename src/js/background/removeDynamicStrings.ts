/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {Parser} from 'acorn';
import {DYNAMIC_STRING_MARKER} from '../config';

const markerLength = DYNAMIC_STRING_MARKER.length;

// This variable, and the parser, are reused because extending the
// parser is surprisingly expensive. This is currently safe because
// `removeDynamicStrings` is synchronous.
let ranges = [0];
function plugin(BaseParser: typeof Parser): typeof Parser {
  // @ts-ignore third party typing doesn't support extension well.
  return class extends BaseParser {
    parseLiteral(value: string) {
      // @ts-ignore third party typing doesn't support extension well.
      const node = super.parseLiteral(value);
      const before = this.input.substring(
        node.start - markerLength,
        node.start,
      );
      if (before === DYNAMIC_STRING_MARKER) {
        // This pushes the index directly after the opening quote and
        // before the closing quote so that only the contents of the
        // string are removed.
        ranges.push(node.start + 1, node.end - 1);
      }
      return node;
    }
  };
}

const extendedParser = Parser.extend(plugin);

export function removeDynamicStrings(rawjs: string): string {
  ranges = [0];
  extendedParser.parse(rawjs, {ecmaVersion: 'latest'});

  let result = '';
  for (let i = 0; i < ranges.length; i += 2) {
    result += rawjs.substring(ranges[i], ranges[i + 1]);
  }

  return result;
}
