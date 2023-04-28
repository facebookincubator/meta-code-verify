/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import {jest} from '@jest/globals';
import {MESSAGE_TYPE, ORIGIN_TYPE, STATES} from '../config';
import {
  hasInvalidAttributes,
  hasInvalidScripts,
  processFoundJS,
  scanForScripts,
  storeFoundJS,
} from '../contentUtils';

describe('contentUtils', () => {
  beforeEach(() => {
    window.chrome.runtime.sendMessage = jest.fn(() => {});
  });
  describe('storeFoundJS', () => {
    it('should handle scripts with src correctly', () => {
      const scriptMap = new Map([['version', []]]);
      const fakeUrl = 'https://fancytestingyouhere.com/';
      const fakeScriptNode = {
        src: fakeUrl,
        getAttribute: () => {},
      };
      storeFoundJS(fakeScriptNode, scriptMap);
      expect(scriptMap.get('version').length).toEqual(1);
      expect(scriptMap.get('version')[0].src).toEqual(fakeUrl);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(1);
    });
    it('should handle inline scripts correctly', () => {
      const scriptMap = new Map([['version', []]]);
      const fakeInnerHtml = 'console.log';
      const fakeLookupKey = 'somelonghashkey';
      const fakeScriptNode = {
        attributes: {
          'data-binary-transparency-hash-key': {value: fakeLookupKey},
        },
        getAttribute: () => {},
        innerHTML: fakeInnerHtml,
      };
      storeFoundJS(fakeScriptNode, scriptMap);
      expect(scriptMap.get('version').length).toEqual(1);
      expect(scriptMap.get('version')[0].rawjs).toEqual(fakeInnerHtml);
      expect(scriptMap.get('version')[0].lookupKey).toEqual(fakeLookupKey);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(1);
    });
    it('should send update icon message if valid', () => {
      const scriptMap = new Map([['version', []]]);
      const fakeUrl = 'https://fancytestingyouhere.com/';
      const fakeScriptNode = {
        src: fakeUrl,
        getAttribute: () => {},
      };
      storeFoundJS(fakeScriptNode, scriptMap);
      const sentMessage = window.chrome.runtime.sendMessage.mock.calls[0][0];
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(1);
      expect(sentMessage.type).toEqual(MESSAGE_TYPE.UPDATE_STATE);
    });
    it.skip('storeFoundJS keeps existing icon if not valid', () => {
      // TODO: come back to this after testing processFoundJS
    });
  });
  describe('hasInvalidAttributes', () => {
    it('should not execute if element has no attributes', () => {
      // no hasAttribute function
      let fakeElement = {
        childNodes: [],
      };
      hasInvalidAttributes(fakeElement);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(0);

      // hasAttribute is a function, but has no attributes
      fakeElement = {
        hasAttribute: () => {
          return false;
        },
        childNodes: [],
      };
      hasInvalidAttributes(fakeElement);
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
      };
      hasInvalidAttributes(fakeElement);
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
      };
      hasInvalidAttributes(fakeElement);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(2);
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
      };
      hasInvalidScripts(fakeElement, []);
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
      };
      const scriptMap = new Map([['version', []]]);
      hasInvalidScripts(fakeElement, scriptMap);
      expect(scriptMap.get('version').length).toBe(1);
      expect(scriptMap.get('version')[0].type).toBe(MESSAGE_TYPE.RAW_JS);
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
          },
        ],
        hasAttribute: () => {
          return false;
        },
        nodeType: 1,
        nodeName: 'nodename',
        tagName: 'tagName',
      };
      const foundScripts = [];
      hasInvalidScripts(fakeElement, foundScripts);
      expect(foundScripts.length).toBe(0);
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
          },
        ],
        hasAttribute: () => {
          return false;
        },
        nodeType: 1,
        nodeName: 'nodename',
        tagName: 'tagName',
      };
      const scriptMap = new Map([['version', []]]);
      hasInvalidScripts(fakeElement, scriptMap);
      expect(scriptMap.get('version').length).toBe(1);
      expect(scriptMap.get('version')[0].type).toBe(MESSAGE_TYPE.RAW_JS);
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
          },
          {
            attributes: {
              'data-binary-transparency-hash-key': {value: 'green'},
              getAttribute: () => {},
            },
            getElementsByTagName: () => {
              return [
                {
                  attributes: {
                    'data-binary-transparency-hash-key': {value: 'green1'},
                  },
                  getAttribute: () => {},
                },
                {
                  attributes: {
                    'data-binary-transparency-hash-key': {value: 'green2'},
                  },
                  getAttribute: () => {},
                },
              ];
            },
            hasAttribute: () => {
              return false;
            },
            nodeType: 1,
            nodeName: 'nodename',
            childNodes: [],
          },
        ],
        hasAttribute: () => {
          return false;
        },
        nodeType: 1,
        nodeName: 'nodename',
        tagName: 'tagName',
      };
      const scriptMap = new Map([['version', []]]);
      hasInvalidScripts(fakeElement, scriptMap);
      expect(scriptMap.get('version').length).toBe(2);
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
  describe('processFoundJS', () => {
    // these are flaky because jest.resestModules doesn't work for esm
    // while the above may be true, redo these as async and flush promises and they should work.
    it('should send valid icon update when no src based scripts are invalid', async () => {
      document.body.innerHTML =
        '<div>' +
        '  <script>console.log("a unit test");</script>' +
        '  <script src="https://facebook.com/"></script>' +
        '</div>';
      scanForScripts();
      window.chrome.runtime.sendMessage.mockImplementation(
        (message, response) => {
          response && response({valid: true});
        },
      );
      processFoundJS(ORIGIN_TYPE.WHATSAPP, '');
      await (() => new Promise(res => setTimeout(res, 10)))();
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(12);
    });
    it('should send valid icon update when no inline based scripts are invalid', async () => {
      document.body.innerHTML =
        '<div>' +
        '  <script src="https://facebook.com/"></script>' +
        '  <script>console.log("a unit test");</script>' +
        '</div>';
      scanForScripts();
      window.chrome.runtime.sendMessage.mockImplementation(
        (message, response) => {
          response && response({valid: true});
        },
      );
      processFoundJS(ORIGIN_TYPE.WHATSAPP, '');
      await (() => new Promise(res => setTimeout(res, 10)))();
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(15);
      expect(window.chrome.runtime.sendMessage.mock.calls[13][0].state).toEqual(
        STATES.VALID,
      );
    });
    it('should send invalid icon update when invalid response received with src', async () => {
      document.body.innerHTML =
        '<div>' +
        '  <script>console.log("a unit test");</script>' +
        '  <script src="https://facebook.com/"></script>' +
        '</div>';
      scanForScripts();
      window.chrome.runtime.sendMessage.mockImplementation(
        (message, response) => {
          response && response({valid: false});
        },
      );
      processFoundJS(ORIGIN_TYPE.WHATSAPP, '');
      await (() => new Promise(res => setTimeout(res, 10)))();
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(23);
      expect(window.chrome.runtime.sendMessage.mock.calls[21][0].state).toEqual(
        STATES.INVALID,
      );
    });
    it.todo(
      'should send invalid icon update when invalid inline response received',
    );
  });
});
