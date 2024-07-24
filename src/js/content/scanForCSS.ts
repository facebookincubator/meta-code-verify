/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {STATES} from '../config';
import {updateCurrentState} from './updateCurrentState';

const CHECKED_STYLESHEET_HREFS = new Set<string>();
const CHECKED_STYLESHEET_HASHES = new Set<string>();

export default function scanForCSS(): void {
  checkForStylesheetChanges();

  setInterval(checkForStylesheetChanges, 1000);
}

async function checkForStylesheetChanges() {
  [...document.styleSheets].forEach(async sheet => {
    const isValid = await checkIsStylesheetValid(sheet);
    updateStateOnInvalidStylesheet(isValid, sheet);
  });
}

async function checkIsStylesheetValid(
  styleSheet: CSSStyleSheet,
): Promise<boolean> {
  const potentialOwnerNode = styleSheet.ownerNode;
  if (
    // CSS external resource
    styleSheet.href &&
    potentialOwnerNode instanceof Element &&
    potentialOwnerNode.tagName === 'LINK'
  ) {
    if (CHECKED_STYLESHEET_HREFS.has(styleSheet.href)) {
      return true;
    }
    CHECKED_STYLESHEET_HREFS.add(styleSheet.href);
  } else if (
    // Inline css
    potentialOwnerNode instanceof Element &&
    potentialOwnerNode.tagName === 'STYLE'
  ) {
    const hashedContent = await hashString(
      potentialOwnerNode.textContent ?? '',
    );
    if (CHECKED_STYLESHEET_HASHES.has(hashedContent)) {
      return true;
    }
    CHECKED_STYLESHEET_HASHES.add(hashedContent);
  }
  return [...styleSheet.cssRules].every(isValidCSSRule);
}

function isValidCSSRule(rule: CSSRule): boolean {
  if (
    rule instanceof CSSKeyframeRule &&
    rule.style.getPropertyValue('font-family') !== ''
  ) {
    // Attempting to animate fonts
    return false;
  }

  if (!(rule instanceof CSSGroupingRule || rule instanceof CSSKeyframesRule)) {
    return true;
  }

  return [...rule.cssRules].every(isValidCSSRule);
}

async function hashString(content: string): Promise<string> {
  const text = new TextEncoder().encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', text);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function updateStateOnInvalidStylesheet(
  isValid: boolean,
  sheet: CSSStyleSheet,
): void {
  if (!isValid) {
    const potentialHref = sheet.href ?? '';
    updateCurrentState(
      STATES.INVALID,
      `Violating CSS stylesheet ${potentialHref}`,
    );
  }
}
