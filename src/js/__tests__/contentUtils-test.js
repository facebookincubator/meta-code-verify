'use strict';

import { jest } from '@jest/globals';
import { ICON_STATE, MESSAGE_TYPE, ORIGIN_TYPE } from '../config.js';
import {
  hasInvalidAttributes,
  hasInvalidScripts,
  processFoundJS,
  scanForScripts,
  storeFoundJS,
} from '../contentUtils.js';

describe('contentUtils', () => {
  beforeEach(() => {
    window.chrome.runtime.sendMessage = jest.fn(() => {});
  });
  describe('storeFoundJS', () => {
    it('should handle scripts with src correctly', () => {
      const scriptList = [];
      const fakeUrl = 'https://fancytestingyouhere.com/';
      const fakeScriptNode = {
        src: fakeUrl,
      };
      storeFoundJS(fakeScriptNode, scriptList);
      expect(scriptList.length).toEqual(1);
      expect(scriptList[0].src).toEqual(fakeUrl);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(1);
    });
    it('should handle inline scripts correctly', () => {
      const scriptList = [];
      const fakeInnerHtml = 'console.log';
      const fakeLookupKey = 'somelonghashkey';
      const fakeScriptNode = {
        attributes: {
          'data-binary-transparency-hash-key': { value: fakeLookupKey },
        },
        innerHTML: fakeInnerHtml,
      };
      storeFoundJS(fakeScriptNode, scriptList);
      expect(scriptList.length).toEqual(1);
      expect(scriptList[0].rawjs).toEqual(fakeInnerHtml);
      expect(scriptList[0].lookupKey).toEqual(fakeLookupKey);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(1);
    });
    it('should send update icon message if valid', () => {
      const scriptList = [];
      const fakeUrl = 'https://fancytestingyouhere.com/';
      const fakeScriptNode = {
        src: fakeUrl,
      };
      storeFoundJS(fakeScriptNode, scriptList);
      const sentMessage = window.chrome.runtime.sendMessage.mock.calls[0][0];
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(1);
      expect(sentMessage.type).toEqual(MESSAGE_TYPE.UPDATE_ICON);
      expect(sentMessage.icon).toEqual(ICON_STATE.PROCESSING);
    });
    it.skip('storeFoundJS keeps existing icon if not valid', () => {
      // TODO: come back to this after testing processFoundJS
    });
  });

  describe('hasInvalidAttributes', () => {
    it('should not execute if element has no attributes', () => {
      // no hasAttributes function
      let fakeElement = {};
      hasInvalidAttributes(fakeElement);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(0);

      // hasAttributes is a function, but has no attributes
      fakeElement = {
        hasAttributes: () => {
          return false;
        },
      };
      hasInvalidAttributes(fakeElement);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(0);
    });
    it('should not update the icon if no violating attributes are found', () => {
      const fakeElement = {
        attributes: [
          { localName: 'background' },
          { localName: 'height' },
          { localName: 'width' },
        ],
        hasAttributes: () => {
          return true;
        },
      };
      hasInvalidAttributes(fakeElement);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(0);
    });
    it('should update the icon if violating attributes are found', () => {
      const fakeElement = {
        attributes: [
          { localName: 'onclick' },
          { localName: 'height' },
          { localName: 'width' },
        ],
        hasAttributes: () => {
          return true;
        },
      };
      hasInvalidAttributes(fakeElement);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(1);
    });
  });

  describe('hasInvalidScripts', () => {
    it('should not check for non-HTMLElements', () => {
      const fakeElement = {
        attributes: [
          { localName: 'onclick' },
          { localName: 'height' },
          { localName: 'width' },
        ],
        hasAttributes: () => {
          return true;
        },
        nodeType: 2,
      };
      hasInvalidScripts(fakeElement, []);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(0);
    });
    it('should store any script elements we find', () => {
      const fakeElement = {
        attributes: { 'data-binary-transparency-hash-key': { value: 'green' } },
        hasAttributes: () => {
          return false;
        },
        nodeName: 'SCRIPT',
        nodeType: 1,
      };
      const foundScripts = [];
      hasInvalidScripts(fakeElement, foundScripts);
      expect(foundScripts.length).toBe(1);
      expect(foundScripts[0].type).toBe(MESSAGE_TYPE.RAW_JS);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(1);
      expect(window.chrome.runtime.sendMessage.mock.calls[0][0].type).toBe(
        MESSAGE_TYPE.UPDATE_ICON
      );
    });
    it('should check all child nodes for non script elements', () => {
      const fakeElement = {
        childNodes: [
          {
            attributes: [
              { localName: 'onclick' },
              { localName: 'height' },
              { localName: 'width' },
            ],
            hasAttributes: () => {
              return true;
            },
            nodeType: 2,
          },
          {
            attributes: [
              { localName: 'onclick' },
              { localName: 'height' },
              { localName: 'width' },
            ],
            hasAttributes: () => {
              return true;
            },
            nodeType: 3,
          },
        ],
        hasAttributes: () => {
          return false;
        },
        nodeType: 1,
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
              { localName: 'onclick' },
              { localName: 'height' },
              { localName: 'width' },
            ],
            hasAttributes: () => {
              return true;
            },
            nodeType: 2,
          },
          {
            attributes: {
              'data-binary-transparency-hash-key': { value: 'green' },
            },
            hasAttributes: () => {
              return false;
            },
            nodeName: 'SCRIPT',
            nodeType: 1,
          },
        ],
        hasAttributes: () => {
          return false;
        },
        nodeType: 1,
      };
      const foundScripts = [];
      hasInvalidScripts(fakeElement, foundScripts);
      expect(foundScripts.length).toBe(1);
      expect(foundScripts[0].type).toBe(MESSAGE_TYPE.RAW_JS);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(1);
      expect(window.chrome.runtime.sendMessage.mock.calls[0][0].type).toBe(
        MESSAGE_TYPE.UPDATE_ICON
      );
    });
    it('should check for any grandchildren script elements', () => {
      const fakeElement = {
        childNodes: [
          {
            attributes: [
              { localName: 'onclick' },
              { localName: 'height' },
              { localName: 'width' },
            ],
            hasAttributes: () => {
              return true;
            },
            nodeType: 2,
          },
          {
            attributes: {
              'data-binary-transparency-hash-key': { value: 'green' },
            },
            getElementsByTagName: () => {
              return [
                {
                  attributes: {
                    'data-binary-transparency-hash-key': { value: 'green1' },
                  },
                },
                {
                  attributes: {
                    'data-binary-transparency-hash-key': { value: 'green2' },
                  },
                },
              ];
            },
            hasAttributes: () => {
              return false;
            },
            nodeType: 1,
          },
        ],
        hasAttributes: () => {
          return false;
        },
        nodeType: 1,
      };
      const foundScripts = [];
      hasInvalidScripts(fakeElement, foundScripts);
      expect(foundScripts.length).toBe(2);
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
          response && response({ valid: true });
        }
      );
      processFoundJS(ORIGIN_TYPE.WHATSAPP, '100');
      await (() => new Promise(res => setTimeout(res, 10)))();
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(9);
      expect(window.chrome.runtime.sendMessage.mock.calls[6][0].icon).toEqual(
        ICON_STATE.VALID
      );
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
          response && response({ valid: true });
        }
      );
      processFoundJS(ORIGIN_TYPE.WHATSAPP, '102');
      await (() => new Promise(res => setTimeout(res, 10)))();
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(11);
      expect(window.chrome.runtime.sendMessage.mock.calls[6][0].icon).toEqual(
        ICON_STATE.VALID
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
          response && response({ valid: false });
        }
      );
      processFoundJS(ORIGIN_TYPE.WHATSAPP, '101');
      await (() => new Promise(res => setTimeout(res, 10)))();
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(14);
      expect(window.chrome.runtime.sendMessage.mock.calls[7][0].icon).toEqual(
        ICON_STATE.INVALID_SOFT
      );
    });
    // it.todo(
    //   'should send invalid icon update when invalid inline response received'
    // );
  });
});
