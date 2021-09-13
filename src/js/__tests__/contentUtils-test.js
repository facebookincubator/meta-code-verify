'use strict';

import { jest } from '@jest/globals';
import { ICON_TYPE, MESSAGE_TYPE } from '../config.js';
import {
  hasInvalidAttributes,
  hasInvalidScripts,
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
      expect(sentMessage.icon).toEqual(ICON_TYPE.PROCESSING);
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
    it.todo('should do some thing.');
  });

  it.todo('test for processFoundJS');
  it.todo('ensure processing icon message is sent');
});
