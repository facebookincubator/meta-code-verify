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
    it('should load manifest when origin is missing', () => {
      window.fetch = jest.fn();
      window.fetch.mockReturnValueOnce(
        Promise.resolve({
          json: () => Promise.resolve({ 1: { someurl: 'somehash' } }),
        })
      );
      const handleMessagesReturnValue = handleMessages(
        {
          origin: ORIGIN_TYPE.WHATSAPP,
          type: MESSAGE_TYPE.LOAD_MANIFEST,
          version: '1',
        },
        null,
        () => {}
      );
      expect(window.fetch.mock.calls.length).toBe(1);
      expect(handleMessagesReturnValue).toBe(true);
    });
    it('should load manifest when manifest is missing', () => {
      window.fetch = jest.fn();
      window.fetch.mockReturnValueOnce(
        Promise.resolve({
          json: () => Promise.resolve({ 2: { someurl: 'somehash' } }),
        })
      );
      const handleMessagesReturnValue = handleMessages(
        {
          origin: ORIGIN_TYPE.WHATSAPP,
          type: MESSAGE_TYPE.LOAD_MANIFEST,
          version: '2',
        },
        null,
        () => {}
      );
      expect(window.fetch.mock.calls.length).toBe(1);
      expect(handleMessagesReturnValue).toBe(true);
    });
    it('return valid when manifest and origin are found in cache', () => {
      window.fetch = jest.fn();
      const handleMessagesReturnValue = handleMessages(
        {
          origin: ORIGIN_TYPE.WHATSAPP,
          type: MESSAGE_TYPE.LOAD_MANIFEST,
          version: '1',
        },
        null,
        () => {}
      );
      expect(window.fetch.mock.calls.length).toBe(0);
      expect(handleMessagesReturnValue).toBe(undefined);
    });
  });

  describe('JS_WITH_SRC', () => {
    it.todo('should return false when no matching origin');
    it.todo('should return false when no matching manifest');
    it.todo('should return false when no matching hash');
    it.todo('should return false if the hashes do not match');
    it.todo('should return true iff the hashes match');
  });

  describe('RAW_JS', () => {
    it.todo('should return false when no matching origin');
    it.todo('should return false when no matching manifest');
    it.todo('should return false when no matching hash');
    it.todo('should return false if the hashes do not match');
    it.todo('should return true iff the hashes match');
  });
});
