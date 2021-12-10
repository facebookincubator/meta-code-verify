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
  WARNING: { badge: 'warning-badge.svg', popup: 'popup.html?state=warning' },
};

export const MESSAGE_TYPE = {
  DEBUG: 'DEBUG',
  GET_DEBUG: 'GET_DEBUG',
  JS_WITH_SRC: 'JS_WITH_SRC',
  LOAD_MANIFEST: 'LOAD_MANIFEST',
  POPUP_STATE: 'POPUP_STATE',
  RAW_JS: 'RAW_JS',
  UPDATE_ICON: 'UPDATE_ICON',
};

export const ORIGIN_TIMEOUT = {
  FACEBOOK: 176400000,
  WHATSAPP: 0,
};

export const ORIGIN_TYPE = {
  FACEBOOK: 'FACEBOOK',
  WHATSAPP: 'WHATSAPP',
};
