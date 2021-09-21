export const ICON_STATE = {
  DEFAULT: { badge: 'icon-badge.svg', popup: 'loading.html' },
  INVALID_HARD: { badge: 'error-badge.svg', popup: 'hard_invalid.html' },
  INVALID_SOFT: { badge: 'error-badge.svg', popup: 'soft_invalid.html' },
  PROCESSING: { badge: 'icon-badge.svg', popup: 'loading.html' },
  VALID: { badge: 'validated-badge.svg', popup: 'validated.html' },
  WARNING: { badge: 'warning-badge.svg', popup: 'warning.html' },
};

export const MESSAGE_TYPE = {
  JS_WITH_SRC: 'JS_WITH_SRC',
  LOAD_MANIFEST: 'LOAD_MANIFEST',
  RAW_JS: 'RAW_JS',
  UPDATE_ICON: 'UPDATE_ICON',
};

export const ORIGIN_ENDPOINT = {
  FACEBOOK: '',
  WHATSAPP: 'https://dev-web.whatsapp.com/bt-manifest',
};

export const ORIGIN_TYPE = {
  FACEBOOK: 'FACEBOOK',
  WHATSAPP: 'WHATSAPP',
};
