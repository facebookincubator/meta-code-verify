/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {MESSAGE_TYPE, STATES} from '../config';
import {sendMessageToBackground} from './sendMessageToBackground';
import {updateCurrentState} from './updateCurrentState';

function getAttributeValue(
  nodeName: string,
  elementName: string,
  element: Element,
  attributeName: string,
  currentAttributeValue: string,
): string {
  if (
    nodeName.toLowerCase() === elementName &&
    element.hasAttribute(attributeName)
  ) {
    return element.getAttribute(attributeName).toLowerCase();
  }
  return currentAttributeValue;
}

const AttributeCheckPairs = [
  {elementName: 'a', attributeName: 'href'},
  {elementName: 'iframe', attributeName: 'src'},
  {elementName: 'iframe', attributeName: 'srcdoc'},
  {elementName: 'form', attributeName: 'action'},
  {elementName: 'input', attributeName: 'formaction'},
  {elementName: 'button', attributeName: 'formaction'},
  {elementName: 'a', attributeName: 'xlink:href'},
  {elementName: 'ncc', attributeName: 'href'},
  {elementName: 'embed', attributeName: 'src'},
  {elementName: 'object', attributeName: 'data'},
  {elementName: 'animate', attributeName: 'xlink:href'},
  {elementName: 'script', attributeName: 'xlink:href'},
  {elementName: 'use', attributeName: 'href'},
  {elementName: 'use', attributeName: 'xlink:href'},
  {elementName: 'x', attributeName: 'href'},
  {elementName: 'x', attributeName: 'xlink:href'},
];

export default function checkElementForViolatingJSUri(element: Element): void {
  let checkURL = '';
  const lowerCaseNodeName = element.nodeName.toLowerCase();
  AttributeCheckPairs.forEach(checkPair => {
    checkURL = getAttributeValue(
      lowerCaseNodeName,
      checkPair.elementName,
      element,
      checkPair.attributeName,
      checkURL,
    );
  });
  if (checkURL !== '') {
    // make sure anchor tags and object tags don't have javascript urls
    if (checkURL.indexOf('javascript') >= 0) {
      sendMessageToBackground({
        type: MESSAGE_TYPE.DEBUG,
        log: 'violating attribute: javascript url',
      });
      updateCurrentState(STATES.INVALID);
    }
  }
}
