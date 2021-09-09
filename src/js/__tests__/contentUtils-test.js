"use strict";

import { jest } from "@jest/globals";
import { storeFoundJS } from "../contentUtils.js";

describe("contentUtils", () => {
  describe("storeFoundJS", () => {
    beforeEach(() => {
      window.chrome.runtime.sendMessage = jest.fn(() => {});
    });
    test("storeFoundJS handles scripts with src correctly", () => {
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
    test("storeFoundJS handles inline scripts correctly", () => {
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
    test.skip("storeFoundJS sends update icon message if valid", () => {});
    test.skip("storeFoundJS keeps existing icon if not valid", () => {});
  });

  test.todo("test for hasInvalidAttributes");
  test.todo("test for hasInvalidScripts");
  test.todo("test for scanForScripts");
  test.todo("test for processFoundJS");
  test.todo("ensure processing icon message is sent");
});
