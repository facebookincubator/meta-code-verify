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
  '', // Chrome - Dynamic: StopAll Ads
  '727bfede71f473991faeb7f4b65632c93e7f7d17189f1b3d952cd990cd150808', // Chrome and Edge: Avast Online Security & Privacy
  '6089301cd61dee5bc1af777e27319c73ae2710496488c68fa41a52da8ba531f7', // FF: Total Adblock-Ad Blocker
  '', // FF: Adblock Plus-free ad blocker
  'c924b9ed122066e5420b125a1accb787c3856c4a422fe9bde47d1f40660271a6', // FF: Smart Blocker
  '', // FF: Popup Blocker(strict)
  '', // FF - Dynamic: Privacy Tweaks
  '', // FF: Privacy Possum
  '', // Edge - Dynamic: Epsilon Ad blocker
  '7a69d1fb29471a9962307f7882adade784141d02617e233eb366ae5f63fd9dd8', // Edge: Minimal Consent
  'd768396bbfda57a3defb0aeba5d9b9aefef562d8204520668f9e275c68455a0c', // Edge: Writer from Writer.com
  '855e2fd1368fc12a14159e26ed3132e6567e8443f8b75081265b93845b865103', // Edge: AdGuard AdBlocker
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
