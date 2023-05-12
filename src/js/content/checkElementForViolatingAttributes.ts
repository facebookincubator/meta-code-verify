/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {STATES} from '../config';
import {updateCurrentState} from './updateCurrentState';

function isEventHandlerAttribute(attribute: string): boolean {
  return attribute.indexOf('on') === 0;
}

export function checkElementForViolatingAttributes(element: Element): void {
  if (
    typeof element.attributes === 'object' &&
    Object.keys(element.attributes).length >= 1
  ) {
    Array.from(element.attributes).forEach(elementAttribute => {
      // check first for violating attributes
      if (isEventHandlerAttribute(elementAttribute.localName)) {
        updateCurrentState(
          STATES.INVALID,
          `violating attribute ${elementAttribute.localName} from element ${element.outerHTML}`,
        );
      }
    });
  }
  // if the element is a math element, check all the attributes of the child node to ensure that there are on href or xlink:href attributes with javascript urls

  if (
    element.tagName.toLowerCase() === 'math' &&
    Object.keys(element.attributes).length >= 1
  ) {
    Array.from(element.attributes).forEach(elementAttribute => {
      if (
        (elementAttribute.localName === 'href' ||
          elementAttribute.localName === 'xlink:href') &&
        element
          .getAttribute(elementAttribute.localName)
          .toLowerCase()
          .startsWith('javascript')
      ) {
        updateCurrentState(
          STATES.INVALID,
          `violating attribute ${elementAttribute.localName} from element ${element.outerHTML}`,
        );
      }
    });
  }
}
