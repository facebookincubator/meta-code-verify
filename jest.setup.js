/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { jest } from '@jest/globals';

window.chrome = {
  browserAction: {
    setIcon: jest.fn(),
    setPopup: jest.fn(),
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
