import { jest } from '@jest/globals';

window.chrome = {
  browserAction: {
    setIcon: jest.fn(),
  },
  runtime: {
    onMessage: {
      addListener: jest.fn(),
    },
    sendMessage: jest.fn(),
  }
};

window.crypto = {
    subtle: {
        digest: jest.fn(),
    }
};

window.TextEncoder = function () {};
window.TextEncoder.encode = jest.fn();

window.Uint8Array = function () {};
