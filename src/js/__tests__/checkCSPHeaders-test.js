/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

import {jest} from '@jest/globals';
import {checkCSPHeaders} from '../content/checkCSPHeaders';

describe('checkCSPHeaders', () => {
  beforeEach(() => {
    window.chrome.runtime.sendMessage = jest.fn(() => {});
  });
  // Enforce precedence
  it('Enforce valid policy from script-src', () => {
    const isValid = checkCSPHeaders(
      [
        `default-src data: blob: 'self' *.facebook.com *.fbcdn.net 'wasm-unsafe-eval';` +
          `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'wasm-unsafe-eval';`,
      ],
      [],
    );
    expect(isValid).toBeTruthy();
  });
  it('Enforce valid policy from default-src', () => {
    const isValid = checkCSPHeaders(
      [
        `default-src data: blob: 'self' *.facebook.com *.fbcdn.net 'wasm-unsafe-eval';`,
      ],
      [],
    );
    expect(isValid).toBeTruthy();
  });
  it('Enforce invalid due to script-src, missing Report policy', () => {
    const isValid = checkCSPHeaders(
      [
        `default-src data: blob: 'self' *.facebook.com *.fbcdn.net;` +
          `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'unsafe-eval';`,
      ],
      [],
    );
    expect(isValid).toBeFalsy();
  });
  it('Enforce invalid due to default-src, missing Report policy', () => {
    const isValid = checkCSPHeaders(
      [
        `default-src data: blob: 'self' *.facebook.com *.fbcdn.net 'unsafe-eval';`,
      ],
      [],
    );
    expect(isValid).toBeFalsy();
  });
  // Report affecting outcome
  it('Enforce invalid, correct Report policy because of script-src', () => {
    const isValid = checkCSPHeaders(
      [],
      [
        `default-src data: blob: 'self' *.facebook.com *.fbcdn.net;` +
          `script-src *.facebook.com *.fbcdn.net blob: data: 'self';`,
      ],
    );
    expect(isValid).toBeTruthy();
  });
  it('Enforce invalid, correct Report policy because of default-src', () => {
    const isValid = checkCSPHeaders(
      [],
      [`default-src data: blob: 'self' *.facebook.com *.fbcdn.net;`],
    );
    expect(isValid).toBeTruthy();
  });
  it('Enforce invalid, incorrect Report policy because of script-src', () => {
    const isValid = checkCSPHeaders(
      [],
      [
        `default-src data: blob: 'self' *.facebook.com *.fbcdn.net;` +
          `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'unsafe-eval';`,
      ],
    );
    expect(isValid).toBeFalsy();
  });
  it('Enforce invalid, incorrect Report policy because of default-src', () => {
    const isValid = checkCSPHeaders(
      [],
      [
        `default-src data: blob: 'self' *.facebook.com *.fbcdn.net 'unsafe-eval';`,
      ],
    );
    expect(isValid).toBeFalsy();
  });
  // Multiple policies, enforcement
  it('Should be valid if one of the policies is enforcing, both script-src', () => {
    const isValid = checkCSPHeaders(
      [
        `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'unsafe-eval';`,
        `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'wasm-unsafe-eval';`,
      ],
      [],
    );
    expect(isValid).toBeTruthy();
  });
  it('Should be valid if one of the policies is enforcing, both default-src', () => {
    const isValid = checkCSPHeaders(
      [
        `default-src *.facebook.com *.fbcdn.net blob: data: 'self' 'unsafe-eval';`,
        `default-src *.facebook.com *.fbcdn.net blob: data: 'self' 'wasm-unsafe-eval';`,
      ],
      [],
    );
    expect(isValid).toBeTruthy();
  });
  it('Should be valid if one of the policies is enforcing, script-src precedence', () => {
    const isValid = checkCSPHeaders(
      [
        `default-src 'unsafe-eval';`,
        `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'wasm-unsafe-eval';`,
      ],
      [],
    );
    expect(isValid).toBeTruthy();
  });
  it('Should be valid if one of the policies is enforcing, script-src precedence', () => {
    const isValid = checkCSPHeaders(
      [
        ``,
        `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'wasm-unsafe-eval';`,
      ],
      [],
    );
    expect(isValid).toBeTruthy();
  });
  it('Should be valid if one of the policies is enforcing, default-src precedence', () => {
    const isValid = checkCSPHeaders(
      [
        ``,
        `default-src *.facebook.com *.fbcdn.net blob: data: 'self' 'wasm-unsafe-eval';`,
      ],
      [],
    );
    expect(isValid).toBeTruthy();
  });
  it('Should be invalid if policy with precedence is not enforcing, script-src precedence', () => {
    const isValid = checkCSPHeaders(
      [
        `default-src *.facebook.com;`,
        `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'unsafe-eval';`,
      ],
      [],
    );
    expect(isValid).toBeFalsy();
  });
  it('Should be invalid if none of the policies are enforcing, script-src precedence', () => {
    const isValid = checkCSPHeaders(
      [
        `default-src *.facebook.com;` +
          `script-src *.facebook.com 'unsafe-eval';`,
        `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'unsafe-eval';`,
      ],
      [],
    );
    expect(isValid).toBeFalsy();
  });
  // Multiple policies, report-only
  it('Should be valid if one of the policies is reporting, both script-src', () => {
    const isValid = checkCSPHeaders(
      [],
      [
        `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'unsafe-eval';`,
        `script-src *.facebook.com *.fbcdn.net blob: data: 'self';`,
      ],
    );
    expect(isValid).toBeTruthy();
  });
  it('Should be valid if one of the policies is reporting, both default-src', () => {
    const isValid = checkCSPHeaders(
      [],
      [
        `default-src *.facebook.com *.fbcdn.net blob: data: 'self' 'unsafe-eval';`,
        `default-src *.facebook.com *.fbcdn.net blob: data: 'self';`,
      ],
    );
    expect(isValid).toBeTruthy();
  });
  it('Should be valid if one of the policies is reporting, script-src precedence', () => {
    const isValid = checkCSPHeaders(
      [],
      [
        `default-src 'unsafe-eval';`,
        `script-src *.facebook.com *.fbcdn.net blob: data: 'self';`,
      ],
    );
    expect(isValid).toBeTruthy();
  });
  it('Should be valid if one of the policies is reporting, script-src precedence', () => {
    const isValid = checkCSPHeaders(
      [],
      [``, `script-src *.facebook.com *.fbcdn.net blob: data: 'self';`],
    );
    expect(isValid).toBeTruthy();
  });
  it('Should be valid if one of the policies is reporting, default-src precedence', () => {
    const isValid = checkCSPHeaders(
      [],
      [``, `default-src *.facebook.com *.fbcdn.net blob: data: 'self';`],
    );
    expect(isValid).toBeTruthy();
  });
  it('Should be invalid if policy with precedence is not reporting, script-src precedence', () => {
    const isValid = checkCSPHeaders(
      [],
      [
        `default-src *.facebook.com;`,
        `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'unsafe-eval';`,
      ],
    );
    expect(isValid).toBeFalsy();
  });
  it('Should be invalid if none of the policies are reporting, script-src precedence', () => {
    const isValid = checkCSPHeaders(
      [],
      [
        `default-src *.facebook.com;` +
          `script-src *.facebook.com 'unsafe-eval';`,
        `script-src *.facebook.com *.fbcdn.net blob: data: 'self' 'unsafe-eval';`,
      ],
    );
    expect(isValid).toBeFalsy();
  });
});
