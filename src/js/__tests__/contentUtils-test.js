"use strict";

import { jest } from "@jest/globals";
import { ICON_TYPE, MESSAGE_TYPE } from "../config.js";
import { hasInvalidAttributes, storeFoundJS } from "../contentUtils.js";

describe("contentUtils", () => {
  describe("storeFoundJS", () => {
    beforeEach(() => {
      window.chrome.runtime.sendMessage = jest.fn(() => {});
    });
    it("should handle scripts with src correctly", () => {
      const scriptList = [];
      const fakeUrl = "https://fancytestingyouhere.com/";
      const fakeScriptNode = {
        src: fakeUrl,
      };
      storeFoundJS(fakeScriptNode, scriptList);
      expect(scriptList.length).toEqual(1);
      expect(scriptList[0].src).toEqual(fakeUrl);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(1);
    });
    it("should handle inline scripts correctly", () => {
      const scriptList = [];
      const fakeInnerHtml = "console.log";
      const fakeLookupKey = "somelonghashkey";
      const fakeScriptNode = {
        attributes: {
          "data-binary-transparency-hash-key": { value: fakeLookupKey },
        },
        innerHTML: fakeInnerHtml,
      };
      storeFoundJS(fakeScriptNode, scriptList);
      expect(scriptList.length).toEqual(1);
      expect(scriptList[0].rawjs).toEqual(fakeInnerHtml);
      expect(scriptList[0].lookupKey).toEqual(fakeLookupKey);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(1);
    });
    it("should send update icon message if valid", () => {
      const scriptList = [];
      const fakeUrl = "https://fancytestingyouhere.com/";
      const fakeScriptNode = {
        src: fakeUrl,
      };
      storeFoundJS(fakeScriptNode, scriptList);
      const sentMessage = window.chrome.runtime.sendMessage.mock.calls[0][0];
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(1);
      expect(sentMessage.type).toEqual(MESSAGE_TYPE.UPDATE_ICON);
      expect(sentMessage.icon).toEqual(ICON_TYPE.PROCESSING);
    });
    it.skip("storeFoundJS keeps existing icon if not valid", () => {
      // TODO: come back to this after testing processFoundJS
    });
  });

  describe("hasInvalidAttributes", () => {
    beforeEach(() => {
      window.chrome.runtime.sendMessage = jest.fn(() => {});
    });
    it("should not execute if element has no attributes", () => {
      // no hasAttributes function
      const fakeElement = {};
      hasInvalidAttributes(fakeElement);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(0);

      // hasAttributes is a function, but has no attributes
      const fakeElement = {
        hasAttributes: () => { return false; }
      };
      hasInvalidAttributes(fakeElement);
      expect(window.chrome.runtime.sendMessage.mock.calls.length).toBe(0);
    });
    it("should not update the icon if no violating attributes are found", () => {

    });
    it.skip("should update the icon if violating attributes are found", () => {});
  });

  it.todo("test for hasInvalidScripts");
  it.todo("test for scanForScripts");
  it.todo("test for processFoundJS");
  it.todo("ensure processing icon message is sent");
});
