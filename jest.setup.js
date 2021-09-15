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
