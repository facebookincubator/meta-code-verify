/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import {removeDynamicStrings} from '../background/removeDynamicStrings';

describe('removeDynamicStrings', () => {
  it('Handles different quote types', () => {
    expect(
      removeDynamicStrings(`const foo = /*BTDS*/'dynamic string';`),
    ).toEqual(`const foo = /*BTDS*/'';`);
    expect(
      removeDynamicStrings(`const foo = /*BTDS*/"dynamic string";`),
    ).toEqual(`const foo = /*BTDS*/"";`);
  });
  it('Handles empty strings', () => {
    expect(removeDynamicStrings(`const foo = /*BTDS*/'';`)).toEqual(
      `const foo = /*BTDS*/'';`,
    );
  });
  it('Handles strings in different scenarios', () => {
    expect(removeDynamicStrings(`/*BTDS*/'dynamic string';`)).toEqual(
      `/*BTDS*/'';`,
    );
    expect(
      removeDynamicStrings(
        `/*BTDS*/'dynamic string' + /*BTDS*/'dynamic string';`,
      ),
    ).toEqual(`/*BTDS*/'' + /*BTDS*/'';`);
    expect(
      removeDynamicStrings(`const foo = JSON.parse(/*BTDS*/'dynamic string');`),
    ).toEqual(`const foo = JSON.parse(/*BTDS*/'');`);
    expect(
      removeDynamicStrings("`before ${/*BTDS*/'dynamic string'} after`;"),
    ).toEqual("`before ${/*BTDS*/''} after`;");
  });
  it('Handles multiple strings', () => {
    expect(
      removeDynamicStrings(
        `/*BTDS*/'dynamic string';/*BTDS*/'dynamic string';/*BTDS*/'dynamic string';`,
      ),
    ).toEqual(`/*BTDS*/'';/*BTDS*/'';/*BTDS*/'';`);
  });
  it('Handles strings across line breaks', () => {
    expect(
      removeDynamicStrings(`/*BTDS*/'dynamic \
      string';`),
    ).toEqual(`/*BTDS*/'';`);
  });
  it('Throws if parsing fails', () => {
    expect(() =>
      removeDynamicStrings(`const foo = JSON.parse(/*BTDS*/'dynamic string';`),
    ).toThrow();
  });
});
