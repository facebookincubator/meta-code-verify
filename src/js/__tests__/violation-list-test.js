/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import {jest} from '@jest/globals';
import '../popup/violation-list';

describe('violation-list', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    window.chrome.storage = {
      local: {
        get: jest.fn(async () => ({
          123: {
            creationTime: 0,
            url: 'https://www.facebook.com/',
            violations: [
              {
                hash: 'abc123',
                origin: 'FACEBOOK',
                version: '1',
              },
            ],
          },
        })),
      },
    };
  });

  it('renders the violation count as text when a row is collapsed', async () => {
    const violationList = document.createElement('violation-list');
    document.body.appendChild(violationList);
    await new Promise(resolve => setTimeout(resolve, 0));

    const expand = violationList.querySelector('[data-expand-src]');
    expand.setAttribute('data-violation-count', '<img data-injected="true">');

    expand.click();
    expand.click();

    expect(expand.textContent).toBe('\u25B6 Show (<img data-injected="true">)');
    expect(expand.querySelector('[data-injected]')).toBeNull();
  });
});
