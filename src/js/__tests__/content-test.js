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
  hasInvalidScriptsOrStyles,
  scanForScriptsAndStyles,
  FOUND_ELEMENTS,
  FOUND_MANIFEST_VERSIONS,
  processFoundElementsForVersion,
  storeFoundElement,
  UNINITIALIZED,
} from '../content';
import {setCurrentOrigin} from '../content/updateCurrentState';

describe('content', () => {
  beforeEach(() => {
    window.chrome.runtime.sendMessage = jest.fn(() => {});
    setCurrentOrigin('FACEBOOK');
    FOUND_ELEMENTS.clear();
    FOUND_ELEMENTS.set(UNINITIALIZED, []);
    FOUND_MANIFEST_VERSIONS.clear();
  });
  describe('storeFoundElement', () => {
    it('should handle scripts with src correctly', () => {
      const fakeUrl = 'https://fancytestingyouhere.com/';
      const fakeScriptNode = {
        src: fakeUrl,
        getAttribute: () => {
          return '123_main';
        },
        nodeName: 'SCRIPT',
      };
      storeFoundElement(fakeScriptNode);
      expect(FOUND_ELEMENTS.get('123').length).toEqual(1);
      expect(FOUND_ELEMENTS.get('123')[0].src).toEqual(fakeUrl);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(1);
    });
    it('should send update icon message if valid', () => {
      const fakeUrl = 'https://fancytestingyouhere.com/';
      const fakeScriptNode = {
        src: fakeUrl,
        getAttribute: () => {
          return '123_main';
        },
        nodeName: 'SCRIPT',
      };
      storeFoundElement(fakeScriptNode);
      const sentMessage = window.chrome.runtime.sendMessage.mock.calls[0][0];
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(1);
      expect(sentMessage.type).toEqual(MESSAGE_TYPE.UPDATE_STATE);
    });
    it('should process a manifest after its JSON becomes available', () => {
      jest.useFakeTimers();
      const manifestNode = document.createElement('script');
      manifestNode.id = 'binary-transparency-manifest';
      manifestNode.type = 'application/json';
      manifestNode.setAttribute('data-manifest-type', 'main');
      manifestNode.setAttribute('data-manifest-rev', '123');

      storeFoundElement(manifestNode);
      manifestNode.textContent = JSON.stringify({
        manifest: [],
        manifest_hashes: {
          combined_hash: 'combined-hash',
          longtail: 'longtail-hash',
          main: 'main-hash',
        },
        leaves: [],
        root: 'root-hash',
        version: '123',
      });
      jest.advanceTimersByTime(20);

      expect(window.chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MESSAGE_TYPE.LOAD_COMPANY_MANIFEST,
          version: '123',
        }),
        expect.any(Function),
      );
      jest.useRealTimers();
    });
    it.skip('storeFoundElement keeps existing icon if not valid', () => {
      // TODO: come back to this after testing processFoundJS
    });
  });
  describe('processFoundElements', () => {
    const createInlineScript = text => {
      const tag = document.createElement('script');
      tag.textContent = text;
      return {otherType: 'main', tag, type: 'inline_script'};
    };

    it('keeps elements queued until their manifest has loaded', async () => {
      const element = createInlineScript('queued script');
      FOUND_ELEMENTS.set('123', [element]);

      await processFoundElementsForVersion('123');

      expect(FOUND_ELEMENTS.get('123')).toEqual([element]);
      expect(window.chrome.runtime.sendMessage).not.toHaveBeenCalled();
    });

    it('does nothing when a loaded manifest has no elements', async () => {
      FOUND_MANIFEST_VERSIONS.add('123');

      await processFoundElementsForVersion('123');

      expect(window.chrome.runtime.sendMessage).not.toHaveBeenCalled();
    });

    it('processes elements from every loaded manifest version', async () => {
      window.chrome.runtime.sendMessage = jest.fn((_message, callback) => {
        callback?.({valid: true});
      });
      FOUND_ELEMENTS.set('123', [createInlineScript('first script')]);
      FOUND_ELEMENTS.set('456', [createInlineScript('second script')]);
      FOUND_MANIFEST_VERSIONS.add('123');
      FOUND_MANIFEST_VERSIONS.add('456');

      await Promise.all([
        processFoundElementsForVersion('123'),
        processFoundElementsForVersion('456'),
      ]);

      expect(FOUND_ELEMENTS.get('123')).toEqual([]);
      expect(FOUND_ELEMENTS.get('456')).toEqual([]);
      const rawSourceMessages = window.chrome.runtime.sendMessage.mock.calls
        .map(([message]) => message)
        .filter(message => message.type === MESSAGE_TYPE.RAW_SRC);
      expect(rawSourceMessages).toHaveLength(2);
      expect(rawSourceMessages.map(message => message.version).sort()).toEqual([
        '123',
        '456',
      ]);
    });
  });
  describe('hasInvalidScriptsOrStyles', () => {
    it('should not check for non-HTMLElements', () => {
      const fakeElement = {
        nodeType: 2,
        tagName: 'tagName',
      };
      hasInvalidScriptsOrStyles(fakeElement);
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
        src: 'fakeurl',
      };
      hasInvalidScriptsOrStyles(fakeElement);
      expect(FOUND_ELEMENTS.get('123').length).toBe(1);
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
      hasInvalidScriptsOrStyles(fakeElement);
      expect(FOUND_ELEMENTS.get(UNINITIALIZED).length).toBe(0);
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
            src: 'fakeUrl',
          },
        ],
        getAttribute: () => {
          return null;
        },
        nodeType: 1,
        nodeName: 'nodename',
        tagName: 'tagName',
      };
      hasInvalidScriptsOrStyles(fakeElement);
      expect(FOUND_ELEMENTS.get('123').length).toBe(1);
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
      hasInvalidScriptsOrStyles(fakeElement);
      expect(FOUND_ELEMENTS.get('123').length).toBe(2);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(2);
    });
  });
  describe('scanForScriptsAndStyles', () => {
    it('should find existing script tags in the DOM and check them', () => {
      jest.resetModules();
      document.body.innerHTML =
        '<div>' +
        '  <script data-btmanifest="123_main" src="https://facebook.com/"></script>' +
        '</div>';
      scanForScriptsAndStyles();
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(1);
    });
  });
});
