/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {STATES} from '../config';
import {tryToGetManifestVersionAndTypeFromNode} from './getManifestVersionAndTypeFromNode';
import {updateCurrentState} from './updateCurrentState';

const CHECKED_STYLESHEET_HASHES = new Set<string>();

export function scanForCSSNeedingManualInspsection(): void {
  checkForStylesheetChanges();
  setInterval(checkForStylesheetChanges, 1000);
}

async function checkForStylesheetChanges() {
  [...document.styleSheets, ...document.adoptedStyleSheets].forEach(
    async sheet => {
      const potentialOwnerNode = sheet.ownerNode;

      if (sheet.href && potentialOwnerNode instanceof HTMLLinkElement) {
        // Link style tags are checked agains the manifest
        return;
      }

      if (
        potentialOwnerNode instanceof HTMLStyleElement &&
        tryToGetManifestVersionAndTypeFromNode(potentialOwnerNode) != null
      ) {
        // Inline style covered by the main checks
        return;
      }

      updateStateOnInvalidStylesheet(
        await checkIsStylesheetValid(sheet),
        sheet,
      );
    },
  );
}

async function checkIsStylesheetValid(
  styleSheet: CSSStyleSheet,
): Promise<boolean> {
  const potentialOwnerNode = styleSheet.ownerNode;

  if (potentialOwnerNode instanceof HTMLStyleElement) {
    const hashedContent = await hashString(
      potentialOwnerNode.textContent ?? '',
    );
    if (CHECKED_STYLESHEET_HASHES.has(hashedContent)) {
      return true;
    }
    CHECKED_STYLESHEET_HASHES.add(hashedContent);
  }

  // We have to look at every CSS rule
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

  if (
    !(
      rule instanceof CSSGroupingRule ||
      rule instanceof CSSKeyframesRule ||
      rule instanceof CSSImportRule
    )
  ) {
    return true;
  }

  let rulesToCheck: Array<CSSRule> = [];

  if (rule instanceof CSSImportRule) {
    const styleSheet = rule.styleSheet;
    if (styleSheet != null) {
      ensureCORSEnabledForStylesheet(styleSheet);
      rulesToCheck = [...styleSheet.cssRules];
    }
  } else {
    rulesToCheck = [...rule.cssRules];
  }

  return rulesToCheck.every(isValidCSSRule);
}

function ensureCORSEnabledForStylesheet(styleSheet: CSSStyleSheet): void {
  try {
    // Ensure all non same origin stylesheets can be accessed (CORS)
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    styleSheet.cssRules;
  } catch {
    updateStateOnInvalidStylesheet(false, styleSheet);
  }
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
