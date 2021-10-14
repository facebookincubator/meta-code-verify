import { MESSAGE_TYPE, ORIGIN_TYPE } from './config.js';
import { processFoundJS, scanForScripts } from './contentUtils.js';

const extractMetaAndLoad = () => {
  // extract JS version from the page
  const versionMetaTag = document.getElementsByName(
    'binary-transparency-manifest-key'
  );
  chrome.runtime.sendMessage({
    type: MESSAGE_TYPE.DEBUG,
    log: 'processing version metatag ' + JSON.stringify(versionMetaTag),
  });
  if (versionMetaTag.length < 1) {
    // TODO add Error state here
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPE.DEBUG,
      log: 'version meta tag is missing!',
    });
  }
  const version = versionMetaTag[0].content;
  console.log('wa meta tag version is ', version);
  // send message to Service Worker to download the correct manifest
  chrome.runtime.sendMessage(
    {
      type: MESSAGE_TYPE.LOAD_MANIFEST,
      origin: ORIGIN_TYPE.WHATSAPP,
      version: version,
    },
    response => {
      // TODO add Warning state here
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPE.DEBUG,
        log:
          'manifest load response is ' + response
            ? JSON.stringify(response).substring(0, 500)
            : '',
      });
      if (response.valid) {
        window.setTimeout(
          () => processFoundJS(ORIGIN_TYPE.WHATSAPP, version),
          0
        );
      }
    }
  );
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', extractMetaAndLoad);
} else {
  extractMetaAndLoad();
}

scanForScripts();
