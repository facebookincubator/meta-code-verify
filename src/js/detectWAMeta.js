import { ORIGIN_TYPE } from './config.js';
import { extractMetaAndLoad, scanForScripts } from './contentUtils.js';

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    extractMetaAndLoad(ORIGIN_TYPE.WHATSAPP);
  });
} else {
  extractMetaAndLoad(ORIGIN_TYPE.WHATSAPP);
}

scanForScripts();
