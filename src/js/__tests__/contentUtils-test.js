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
  FOUND_SCRIPTS,
  storeFoundJS,
  UNINITIALIZED,
} from '../contentUtils';
import {setCurrentOrigin} from '../content/updateCurrentState';

describe('contentUtils', () => {
  beforeEach(() => {
    window.chrome.runtime.sendMessage = jest.fn(() => {});
    setCurrentOrigin('FACEBOOK');
    FOUND_SCRIPTS.clear();
    FOUND_SCRIPTS.set(UNINITIALIZED, []);
  });
  describe('storeFoundJS', () => {
    it('should handle scripts with src correctly', () => {
      const fakeUrl = 'https://fancytestingyouhere.com/';
      const fakeScriptNode = {
        src: fakeUrl,
        getAttribute: () => {
          return '123_main';
        },
      };
      storeFoundJS(fakeScriptNode);
      expect(FOUND_SCRIPTS.get('123').length).toEqual(1);
      expect(FOUND_SCRIPTS.get('123')[0].src).toEqual(fakeUrl);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(1);
    });
    it('should send update icon message if valid', () => {
      const fakeUrl = 'https://fancytestingyouhere.com/';
      const fakeScriptNode = {
        src: fakeUrl,
        getAttribute: () => {
          return '123_main';
        },
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
        nodeType: 2,
        tagName: 'tagName',
      };
      hasInvalidScripts(fakeElement);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(0);
    });
    it('should store any script elements we find', () => {
      const fakeElement = {
        getAttribute: () => {
          return '123_main';
        },
        childNodes: [],
        nodeName: 'SCRIPT',
        nodeType: 1,
        tagName: 'tagName',
        src: '',
      };
      hasInvalidScripts(fakeElement);
      expect(FOUND_SCRIPTS.get('123').length).toBe(1);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(1);
      expect(window.chrome.runtime.sendMessage.mock.calls[0][0].type).toBe(
        MESSAGE_TYPE.UPDATE_STATE,
      );
    });
    it('should check all child nodes for non script elements', () => {
      const fakeElement = {
        childNodes: [
          {
            getAttribute: () => {
              return 'attr';
            },
            nodeType: 2,
            nodeName: 'nodename',
            tagName: 'tagName',
          },
          {
            getAttribute: () => {
              return 'attr';
            },
            nodeType: 3,
            nodeName: 'nodename',
            tagName: 'tagName',
          },
        ],
        getAttribute: () => {
          return 'attr';
        },
        nodeType: 1,
        nodeName: 'nodename',
        tagName: 'tagName',
      };
      hasInvalidScripts(fakeElement);
      expect(FOUND_SCRIPTS.get(UNINITIALIZED).length).toBe(0);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(0);
    });
    it('should store any script element direct children', () => {
      const fakeElement = {
        childNodes: [
          {
            getAttribute: () => {
              return 'attr';
            },
            nodeType: 2,
            nodeName: 'nodename',
            childNodes: [],
            tagName: 'tagName',
          },
          {
            getAttribute: () => {
              return '123_main';
            },
            nodeName: 'SCRIPT',
            nodeType: 1,
            childNodes: [],
            tagName: 'tagName',
            src: '',
          },
        ],
        getAttribute: () => {
          return null;
        },
        nodeType: 1,
        nodeName: 'nodename',
        tagName: 'tagName',
      };
      hasInvalidScripts(fakeElement);
      expect(FOUND_SCRIPTS.get('123').length).toBe(1);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(1);
      expect(window.chrome.runtime.sendMessage.mock.calls[0][0].type).toBe(
        MESSAGE_TYPE.UPDATE_STATE,
      );
    });
    it('should check for any grandchildren script elements', () => {
      const fakeElement = {
        childNodes: [
          {
            getAttribute: () => {
              return 'attr';
            },
            nodeType: 2,
            nodeName: 'nodename',
            childNodes: [],
            tagName: 'tagName',
          },
          {
            childNodes: [
              {
                nodeName: 'script',
                nodeType: 1,
                getAttribute: () => {
                  return '123_main';
                },
                tagName: 'tagName',
              },
              {
                getAttribute: () => {
                  return '123_longtail';
                },
                nodeName: 'script',
                nodeType: 1,
                tagName: 'tagName',
              },
            ],
            getAttribute: () => {
              return null;
            },
            nodeType: 1,
            nodeName: 'nodename',
            tagName: 'tagName',
          },
        ],
        getAttribute: () => {
          return null;
        },
        nodeType: 1,
        nodeName: 'nodename',
        tagName: 'tagName',
      };
      hasInvalidScripts(fakeElement);
      expect(FOUND_SCRIPTS.get('123').length).toBe(2);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(2);
    });
  });
  describe('scanForScripts', () => {
    it('should find existing script tags in the DOM and check them', () => {
      jest.resetModules();
      document.body.innerHTML =
        '<div>' +
        '  <script data-btmanifest="123_main" src="https://facebook.com/"></script>' +
        '</div>';
      scanForScripts();
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(1);
    });
  });
});
