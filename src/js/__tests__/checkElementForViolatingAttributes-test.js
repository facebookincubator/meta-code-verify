/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import {checkElementForViolatingAttributes} from '../content/checkElementForViolatingAttributes';

describe('contentUtils', () => {
  describe('checkElementForViolatingAttributes', () => {
    it('should not execute if element has no attributes', () => {
      // no hasAttribute function
      let fakeElement = {
        childNodes: [],
        tagName: 'tagName',
      };
      checkElementForViolatingAttributes(fakeElement);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(0);

      // hasAttribute is a function, but has no attributes
      fakeElement = {
        hasAttribute: () => {
          return false;
        },
        childNodes: [],
        tagName: 'tagName',
      };
      checkElementForViolatingAttributes(fakeElement);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(0);
    });
    it('should not update the icon if no violating attributes are found', () => {
      const fakeElement = {
        attributes: [
          {localName: 'background'},
          {localName: 'height'},
          {localName: 'width'},
        ],
        hasAttribute: () => {
          return true;
        },
        childNodes: [],
        tagName: 'div',
      };
      checkElementForViolatingAttributes(fakeElement);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(0);
    });
    it('should update the icon if violating attributes are found', () => {
      const fakeElement = {
        attributes: [
          {localName: 'onclick'},
          {localName: 'height'},
          {localName: 'width'},
        ],
        hasAttributes: () => {
          return true;
        },
        childNodes: [],
        tagName: 'div',
      };
      checkElementForViolatingAttributes(fakeElement);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(1);
    });
  });
});
