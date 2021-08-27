import { MESSAGE_TYPE, ORIGIN_TYPE } from "./config.js";
import { processFoundJS, scanForScripts } from "./contentUtils.js";

const extractMetaAndLoad = () => {
  // extract JS version from the page
  const versionMetaTag = document.getElementsByName(
    "binary-transparency-manifest-key"
  );
  console.log("processing version metatag ", versionMetaTag);
  if (versionMetaTag.length < 1) {
    console.log("processed version meta tag, missing tag warning");
  }
  const version = versionMetaTag[0].content;
  // send message to Service Worker to download the correct manifest
  chrome.runtime.sendMessage(
    {
      type: MESSAGE_TYPE.LOAD_MANIFEST,
      origin: ORIGIN_TYPE.WHATSAPP,
      version: version,
    },
    response => {
      console.log("proc manifest load response is ", response);
      if (response.valid) {
        // work through the list of scripts we've found
        window.setTimeout(
          () => processFoundJS(ORIGIN_TYPE.WHATSAPP, version),
          0
        );
      }
    }
  );
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", extractMetaAndLoad);
} else {
  extractMetaAndLoad();
}

scanForScripts();
