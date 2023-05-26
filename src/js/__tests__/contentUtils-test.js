/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import {jest} from '@jest/globals';
import {MESSAGE_TYPE} from '../config';
import {
  hasInvalidScripts,
  scanForScripts,
  testOnly_getFoundScripts,
  storeFoundJS,
} from '../contentUtils';

describe('contentUtils', () => {
  beforeEach(() => {
    window.chrome.runtime.sendMessage = jest.fn(() => {});
    testOnly_getFoundScripts().splice(0);
  });
  describe('storeFoundJS', () => {
    it('should handle scripts with src correctly', () => {
      const fakeUrl = 'https://fancytestingyouhere.com/';
      const fakeScriptNode = {
        src: fakeUrl,
        getAttribute: () => {},
      };
      storeFoundJS(fakeScriptNode);
      expect(testOnly_getFoundScripts().length).toEqual(1);
      expect(testOnly_getFoundScripts()[0].src).toEqual(fakeUrl);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(1);
    });
    it('should handle inline scripts correctly', () => {
      const fakeInnerHtml = 'console.log';
      const fakeLookupKey = 'somelonghashkey';
      const fakeScriptNode = {
        attributes: {
          'data-binary-transparency-hash-key': {value: fakeLookupKey},
        },
        getAttribute: () => {},
        innerHTML: fakeInnerHtml,
      };
      storeFoundJS(fakeScriptNode);
      expect(testOnly_getFoundScripts().length).toEqual(1);
      expect(testOnly_getFoundScripts()[0].rawjs).toEqual(fakeInnerHtml);
      expect(testOnly_getFoundScripts()[0].lookupKey).toEqual(fakeLookupKey);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(1);
    });
    it('should send update icon message if valid', () => {
      const fakeUrl = 'https://fancytestingyouhere.com/';
      const fakeScriptNode = {
        src: fakeUrl,
        getAttribute: () => {},
      };
      storeFoundJS(fakeScriptNode);
      const sentMessage = window.chrome.runtime.sendMessage.mock.calls[0][0];
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(1);
      expect(sentMessage.type).toEqual(MESSAGE_TYPE.UPDATE_STATE);
    });
    it.skip('storeFoundJS keeps existing icon if not valid', () => {
      // TODO: come back to this after testing processFoundJS
    });
  });
  describe('hasInvalidScripts', () => {
    it('should not check for non-HTMLElements', () => {
      const fakeElement = {
        attributes: [
          {localName: 'onclick'},
          {localName: 'height'},
          {localName: 'width'},
        ],
        hasAttribute: () => {
          return true;
        },
        nodeType: 2,
        tagName: 'tagName',
      };
      hasInvalidScripts(fakeElement);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(0);
    });
    it('should store any script elements we find', () => {
      const fakeElement = {
        attributes: {'data-binary-transparency-hash-key': {value: 'green'}},
        getAttribute: () => {},
        hasAttribute: () => {
          return false;
        },
        childNodes: [],
        nodeName: 'SCRIPT',
        nodeType: 1,
        tagName: 'div',
      };
      hasInvalidScripts(fakeElement);
      expect(testOnly_getFoundScripts().length).toBe(1);
      expect(testOnly_getFoundScripts()[0].type).toBe(MESSAGE_TYPE.RAW_JS);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(1);
      expect(window.chrome.runtime.sendMessage.mock.calls[0][0].type).toBe(
        MESSAGE_TYPE.UPDATE_STATE,
      );
    });
    it('should check all child nodes for non script elements', () => {
      const fakeElement = {
        childNodes: [
          {
            attributes: [
              {localName: 'onclick'},
              {localName: 'height'},
              {localName: 'width'},
            ],
            hasAttribute: () => {
              return true;
            },
            nodeType: 2,
            nodeName: 'nodename',
            tagName: 'tagName',
          },
          {
            attributes: [
              {localName: 'onclick'},
              {localName: 'height'},
              {localName: 'width'},
            ],
            hasAttribute: () => {
              return true;
            },
            nodeType: 3,
            nodeName: 'nodename',
            tagName: 'tagName',
          },
        ],
        hasAttribute: () => {
          return false;
        },
        nodeType: 1,
        nodeName: 'nodename',
        tagName: 'tagName',
      };
      hasInvalidScripts(fakeElement);
      expect(testOnly_getFoundScripts().length).toBe(0);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(0);
    });
    it('should store any script element direct children', () => {
      const fakeElement = {
        childNodes: [
          {
            attributes: [
              {localName: 'onclick'},
              {localName: 'height'},
              {localName: 'width'},
            ],
            hasAttribute: () => {
              return true;
            },
            nodeType: 2,
            nodeName: 'nodename',
            childNodes: [],
            tagName: 'tagName',
          },
          {
            attributes: {
              'data-binary-transparency-hash-key': {value: 'green'},
            },
            getAttribute: () => {},
            hasAttribute: () => {
              return false;
            },
            nodeName: 'SCRIPT',
            nodeType: 1,
            childNodes: [],
            tagName: 'tagName',
          },
        ],
        hasAttribute: () => {
          return false;
        },
        nodeType: 1,
        nodeName: 'nodename',
        tagName: 'tagName',
      };
      hasInvalidScripts(fakeElement);
      expect(testOnly_getFoundScripts().length).toBe(1);
      expect(testOnly_getFoundScripts()[0].type).toBe(MESSAGE_TYPE.RAW_JS);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(1);
      expect(window.chrome.runtime.sendMessage.mock.calls[0][0].type).toBe(
        MESSAGE_TYPE.UPDATE_STATE,
      );
    });
    it('should check for any grandchildren script elements', () => {
      const fakeElement = {
        childNodes: [
          {
            attributes: [
              {localName: 'onclick'},
              {localName: 'height'},
              {localName: 'width'},
            ],
            hasAttribute: () => {
              return true;
            },
            nodeType: 2,
            nodeName: 'nodename',
            childNodes: [],
            tagName: 'tagName',
          },
          {
            attributes: {
              'data-binary-transparency-hash-key': {value: 'green'},
              getAttribute: () => {},
            },
            childNodes: [
              {
                attributes: {
                  'data-binary-transparency-hash-key': {value: 'green1'},
                },
                nodeName: 'script',
                nodeType: 1,
                getAttribute: () => {},
                hasAttribute: () => {
                  return false;
                },
                tagName: 'tagName',
              },
              {
                attributes: {
                  'data-binary-transparency-hash-key': {value: 'green2'},
                },
                getAttribute: () => {},
                hasAttribute: () => {
                  return false;
                },
                nodeName: 'script',
                nodeType: 1,
                tagName: 'tagName',
              },
            ],
            hasAttribute: () => {
              return false;
            },
            nodeType: 1,
            nodeName: 'nodename',
            tagName: 'tagName',
          },
        ],
        hasAttribute: () => {
          return false;
        },
        nodeType: 1,
        nodeName: 'nodename',
        tagName: 'tagName',
      };
      hasInvalidScripts(fakeElement);
      expect(testOnly_getFoundScripts().length).toBe(2);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(2);
    });
  });
  describe('scanForScripts', () => {
    it('should find existing script tags in the DOM and check them', () => {
      jest.resetModules();
      document.body.innerHTML =
        '<div>' +
        '  <script>console.log("a unit test");</script>' +
        '  <script src="https://facebook.com/"></script>' +
        '</div>';
      scanForScripts();
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(2);
    });
  });
});
