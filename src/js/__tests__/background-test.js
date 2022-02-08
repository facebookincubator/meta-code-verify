/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import { jest } from '@jest/globals';
import { MESSAGE_TYPE, ORIGIN_TYPE } from '../config.js';
import { handleMessages } from '../background.js';

describe('background', () => {
  beforeEach(() => {
    window.chrome.browserAction.setIcon = jest.fn(() => {});
  });
  describe('UPDATE_ICON', () => {
    it('should send update icon message when receiving icon update', () => {
      const testIcon = 'testIcon';
      handleMessages(
        {
          icon: testIcon,
          type: MESSAGE_TYPE.UPDATE_ICON,
        },
        null,
        () => {}
      );
      expect(window.chrome.browserAction.setIcon.mock.calls.length).toBe(1);
    });
  });

  describe('LOAD_MANIFEST', () => {
    it('should load manifest when origin is missing', async () => {
      window.fetch = jest.fn();
      window.fetch.mockReturnValueOnce(
        Promise.resolve({
          json: () => Promise.resolve({ 1: { '/somepath': 'somehash' } }),
        })
      );
      const mockSendResponse = jest.fn();
      const handleMessagesReturnValue = handleMessages(
        {
          origin: ORIGIN_TYPE.WHATSAPP,
          type: MESSAGE_TYPE.LOAD_MANIFEST,
          version: '1',
        },
        null,
        mockSendResponse
      );
      await (() => new Promise(res => setTimeout(res, 10)))();
      expect(window.fetch.mock.calls.length).toBe(1);
      expect(handleMessagesReturnValue).toBe(true);
      expect(mockSendResponse.mock.calls.length).toBe(1);
      expect(mockSendResponse.mock.calls[0][0].valid).toBe(true);
    });
    it('should load manifest when manifest is missing', async () => {
      window.fetch = jest.fn();
      window.fetch.mockReturnValueOnce(
        Promise.resolve({
          json: () =>
            Promise.resolve({ 2: { '/someotherpath': 'someotherhash' } }),
        })
      );
      const mockSendResponse = jest.fn();
      const handleMessagesReturnValue = handleMessages(
        {
          origin: ORIGIN_TYPE.WHATSAPP,
          type: MESSAGE_TYPE.LOAD_MANIFEST,
          version: '2',
        },
        null,
        mockSendResponse
      );
      await (() => new Promise(res => setTimeout(res, 10)))();
      expect(window.fetch.mock.calls.length).toBe(1);
      expect(handleMessagesReturnValue).toBe(true);
      expect(mockSendResponse.mock.calls.length).toBe(1);
      expect(mockSendResponse.mock.calls[0][0].valid).toBe(true);
    });
    it('return valid when manifest and origin are found in cache', async () => {
      window.fetch = jest.fn();
      const mockSendResponse = jest.fn();
      const handleMessagesReturnValue = handleMessages(
        {
          origin: ORIGIN_TYPE.WHATSAPP,
          type: MESSAGE_TYPE.LOAD_MANIFEST,
          version: '1',
        },
        null,
        mockSendResponse
      );
      await (() => new Promise(res => setTimeout(res, 10)))();
      expect(window.fetch.mock.calls.length).toBe(0);
      expect(handleMessagesReturnValue).toBe(undefined);
      expect(mockSendResponse.mock.calls.length).toBe(1);
      expect(mockSendResponse.mock.calls[0][0].valid).toBe(true);
    });
  });

  describe('JS_WITH_SRC', () => {
    it('should return false when no matching origin', () => {
      const mockSendResponse = jest.fn();
      handleMessages(
        {
          origin: 'NOT_AN_ORIGIN',
          type: MESSAGE_TYPE.JS_WITH_SRC,
          version: '1',
        },
        null,
        mockSendResponse
      );
      expect(mockSendResponse.mock.calls.length).toBe(1);
      expect(mockSendResponse.mock.calls[0][0].valid).toBe(false);
      expect(mockSendResponse.mock.calls[0][0].reason).toBe(
        'no matching origin'
      );
    });
    it('should return false when no matching manifest', () => {
      const mockSendResponse = jest.fn();
      handleMessages(
        {
          origin: ORIGIN_TYPE.WHATSAPP,
          type: MESSAGE_TYPE.JS_WITH_SRC,
          version: 'NOT_A_VALID_VERSION',
        },
        null,
        mockSendResponse
      );
      expect(mockSendResponse.mock.calls.length).toBe(1);
      expect(mockSendResponse.mock.calls[0][0].valid).toBe(false);
      expect(mockSendResponse.mock.calls[0][0].reason).toBe(
        'no matching manifest'
      );
    });
    it('should return false when no matching hash', () => {
      const mockSendResponse = jest.fn();
      handleMessages(
        {
          origin: ORIGIN_TYPE.WHATSAPP,
          type: MESSAGE_TYPE.JS_WITH_SRC,
          src: 'https://www.notavalidurl.com/nottherightpath',
          version: '1',
        },
        null,
        mockSendResponse
      );
      expect(mockSendResponse.mock.calls.length).toBe(1);
      expect(mockSendResponse.mock.calls[0][0].valid).toBe(false);
      expect(mockSendResponse.mock.calls[0][0].reason).toBe('no matching hash');
    });
    it('should return false if the hashes do not match', async () => {
      window.fetch = jest.fn();
      window.fetch.mockReturnValueOnce(
        Promise.resolve({
          text: () =>
            Promise.resolve('console.log("all the JavaScript goes here")'),
        })
      );
      const encodeMock = jest.fn();
      window.TextEncoder = function () {
        return {
          encode: encodeMock,
        };
      };
      encodeMock.mockReturnValueOnce('abc');
      window.crypto.subtle.digest = jest
        .fn()
        .mockReturnValueOnce(Promise.resolve('def'));
      window.Uint8Array = jest.fn().mockReturnValueOnce(['somefakehash']);
      const mockSendResponse = jest.fn();
      handleMessages(
        {
          origin: ORIGIN_TYPE.WHATSAPP,
          type: MESSAGE_TYPE.JS_WITH_SRC,
          src: 'https://www.notavalidurl.com/someotherpath',
          version: '2',
        },
        null,
        mockSendResponse
      );
      await (() => new Promise(res => setTimeout(res, 10)))();
      expect(mockSendResponse.mock.calls.length).toBe(1);
      expect(mockSendResponse.mock.calls[0][0].valid).toBe(false);
    });
    it('should return true iff the hashes match', async () => {
      window.fetch = jest.fn();
      window.fetch.mockReturnValueOnce(
        Promise.resolve({
          text: () =>
            Promise.resolve('console.log("all the JavaScript goes here")'),
        })
      );
      const encodeMock = jest.fn();
      window.TextEncoder = function () {
        return {
          encode: encodeMock,
        };
      };
      encodeMock.mockReturnValueOnce('abc');
      window.crypto.subtle.digest = jest
        .fn()
        .mockReturnValueOnce(Promise.resolve('def'));
      window.Uint8Array = jest.fn().mockReturnValueOnce(['someotherhash']);
      const mockSendResponse = jest.fn();
      handleMessages(
        {
          origin: ORIGIN_TYPE.WHATSAPP,
          type: MESSAGE_TYPE.JS_WITH_SRC,
          src: 'https://www.notavalidurl.com/someotherpath',
          version: '2',
        },
        null,
        mockSendResponse
      );
      await (() => new Promise(res => setTimeout(res, 10)))();
      expect(mockSendResponse.mock.calls.length).toBe(1);
      expect(mockSendResponse.mock.calls[0][0].valid).toBe(true);
    });
  });

  describe('RAW_JS', () => {
    it('should return false when no matching origin', () => {
      const mockSendResponse = jest.fn();
      handleMessages(
        {
          origin: 'NOT_AN_ORIGIN',
          type: MESSAGE_TYPE.RAW_JS,
          version: '1',
        },
        null,
        mockSendResponse
      );
      expect(mockSendResponse.mock.calls.length).toBe(1);
      expect(mockSendResponse.mock.calls[0][0].valid).toBe(false);
      expect(mockSendResponse.mock.calls[0][0].reason).toBe(
        'no matching origin'
      );
    });
    it('should return false when no matching manifest', () => {
      const mockSendResponse = jest.fn();
      handleMessages(
        {
          origin: ORIGIN_TYPE.WHATSAPP,
          type: MESSAGE_TYPE.RAW_JS,
          version: 'NOT_A_VALID_VERSION',
        },
        null,
        mockSendResponse
      );
      expect(mockSendResponse.mock.calls.length).toBe(1);
      expect(mockSendResponse.mock.calls[0][0].valid).toBe(false);
      expect(mockSendResponse.mock.calls[0][0].reason).toBe(
        'no matching manifest'
      );
    });
    it('should return false when no matching hash', async () => {
      const mockSendResponse = jest.fn();
      const encodeMock = jest.fn();
      window.TextEncoder = function () {
        return {
          encode: encodeMock,
        };
      };
      encodeMock.mockReturnValueOnce('abc');
      window.crypto.subtle.digest = jest
        .fn()
        .mockReturnValueOnce(Promise.resolve('def'));
      window.Uint8Array = jest.fn().mockReturnValueOnce(['somefakehash']);
      handleMessages(
        {
          origin: ORIGIN_TYPE.WHATSAPP,
          type: MESSAGE_TYPE.RAW_JS,
          src: 'https://www.notavalidurl.com/nottherightpath',
          version: '1',
        },
        null,
        mockSendResponse
      );
      await (() => new Promise(res => setTimeout(res, 10)))();
      expect(mockSendResponse.mock.calls.length).toBe(1);
      expect(mockSendResponse.mock.calls[0][0].valid).toBe(false);
      expect(mockSendResponse.mock.calls[0][0].reason).toBe('no matching hash');
    });
    it('should return false if the hashes do not match', async () => {
      const encodeMock = jest.fn();
      window.TextEncoder = function () {
        return {
          encode: encodeMock,
        };
      };
      encodeMock.mockReturnValueOnce('abc');
      window.crypto.subtle.digest = jest
        .fn()
        .mockReturnValueOnce(Promise.resolve('def'));
      window.Uint8Array = jest.fn().mockReturnValueOnce(['somefakehash']);
      const mockSendResponse = jest.fn();
      handleMessages(
        {
          origin: ORIGIN_TYPE.WHATSAPP,
          type: MESSAGE_TYPE.RAW_JS,
          rawjs: 'console.log("all the JavaScript goes here");',
          version: '2',
        },
        null,
        mockSendResponse
      );
      await (() => new Promise(res => setTimeout(res, 10)))();
      expect(mockSendResponse.mock.calls.length).toBe(1);
      expect(mockSendResponse.mock.calls[0][0].valid).toBe(false);
    });
    it('should return true iff the hashes match', async () => {
      const encodeMock = jest.fn();
      window.TextEncoder = function () {
        return {
          encode: encodeMock,
        };
      };
      encodeMock.mockReturnValueOnce('abc');
      window.crypto.subtle.digest = jest
        .fn()
        .mockReturnValueOnce(Promise.resolve('def'));
      window.Uint8Array = jest.fn().mockReturnValueOnce(['someotherhash']);
      const mockSendResponse = jest.fn();
      handleMessages(
        {
          origin: ORIGIN_TYPE.WHATSAPP,
          lookupKey: '/someotherpath',
          type: MESSAGE_TYPE.RAW_JS,
          rawjs: 'console.log("all the JavaScript goes here");',
          version: '2',
        },
        null,
        mockSendResponse
      );
      await (() => new Promise(res => setTimeout(res, 10)))();
      expect(mockSendResponse.mock.calls.length).toBe(1);
      expect(mockSendResponse.mock.calls[0][0].valid).toBe(true);
    });
  });
});
