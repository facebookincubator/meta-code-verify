"use strict";

import { storeFoundJS } from "../contentUtils.js";

describe("contentUtils", () => {
  describe("storeFoundJS", () => {
    test("storeFoundJS handles scripts with src correctly", () => {
      const scriptList = [];
      const fakeUrl = "https://fancytestingyouhere.com/";
      const fakeScriptNode = {
        src: fakeUrl,
      };
      storeFoundJS(fakeScriptNode, scriptList);
      expect(scriptList.length).toEqual(1);
    });
    test.skip("storeFoundJS handles inline scripts correclty", () => {});
    test.skip("storeFoundJS sends update icon message if valid", () => {});
    test.skip("storeFoundJS keeps existing icon if not valid", () => {});
  });

  test.todo("test for hasInvalidAttributes");
  test.todo("test for hasInvalidScripts");
  test.todo("test for scanForScripts");
  test.todo("test for processFoundJS");
  test.todo("ensure processing icon message is sent");
});
