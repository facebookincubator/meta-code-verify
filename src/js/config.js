export const ICON_STATE = {
  DEFAULT: { badge: 'icon-badge.svg', popup: 'popup.html?state=loading' },
  INVALID_HARD: {
    badge: 'error-badge.svg',
    popup: 'popup.html?state=error',
  },
  INVALID_SOFT: {
    badge: 'error-badge.svg',
    popup: 'popup.html?state=error',
  },
  PROCESSING: { badge: 'icon-badge.svg', popup: 'popup.html?state=loading' },
  VALID: { badge: 'validated-badge.svg', popup: 'popup.html?state=valid' },
  WARNING_RISK: {
    badge: 'warning-badge.svg',
    popup: 'popup.html?state=warning_risk',
  },
  WARNING_TIMEOUT: {
    badge: 'warning-badge.svg',
    popup: 'popup.html?state=warning_timeout',
  },
};

export const KNOWN_EXTENSION_HASHES = [
  '', // Chrome: StopAll Ads
  '727bfede71f473991faeb7f4b65632c93e7f7d17189f1b3d952cd990cd150808', // Chrome: Avast Online Security & Privacy
];

export const MESSAGE_TYPE = {
  DEBUG: 'DEBUG',
  GET_DEBUG: 'GET_DEBUG',
  JS_WITH_SRC: 'JS_WITH_SRC',
  LOAD_MANIFEST: 'LOAD_MANIFEST',
  POPUP_STATE: 'POPUP_STATE',
  RAW_JS: 'RAW_JS',
  UPDATE_ICON: 'UPDATE_ICON',
};

export const ORIGIN_HOST = {
  FACEBOOK: 'facebook.com',
  WHATSAPP: 'whatsapp.com',
};

export const ORIGIN_TIMEOUT = {
  FACEBOOK: 176400000,
  WHATSAPP: 0,
};

export const ORIGIN_TYPE = {
  FACEBOOK: 'FACEBOOK',
  WHATSAPP: 'WHATSAPP',
};
