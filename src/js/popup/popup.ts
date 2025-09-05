/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import '../globals';

import type {Origin, State} from '../config';
import {MESSAGE_TYPE, ORIGIN_TYPE, STATES} from '../config.js';

import './violation-list';

type PopupState =
  | 'loading'
  | 'warning_risk'
  | 'warning_timeout'
  | 'error'
  | 'valid'
  | 'menu'
  | 'download'
  | 'violation_list';

const STATE_TO_POPUP_STATE: Record<State, PopupState> = {
  [STATES.START]: 'loading',
  [STATES.PROCESSING]: 'loading',
  [STATES.IGNORE]: 'loading',
  [STATES.INVALID]: 'error',
  [STATES.RISK]: 'warning_risk',
  [STATES.VALID]: 'valid',
  [STATES.TIMEOUT]: 'warning_timeout',
};

const ORIGIN_TO_LEARN_MORE_PAGES: Record<Origin, Record<string, string>> = {
  [ORIGIN_TYPE.FACEBOOK]: {
    about: chrome.i18n.getMessage('about_code_verify_faq_url_fb'),
    error: chrome.i18n.getMessage('validation_failure_faq_url_fb'),
    warning_risk: chrome.i18n.getMessage('possible_risk_detected_faq_url_fb'),
    warning_timeout: chrome.i18n.getMessage('network_timeout_faq_url_fb'),
  },
  [ORIGIN_TYPE.MESSENGER]: {
    about: chrome.i18n.getMessage('about_code_verify_faq_url_msgr'),
    error: chrome.i18n.getMessage('validation_failure_faq_url_msgr'),
    warning_risk: chrome.i18n.getMessage('possible_risk_detected_faq_url_msgr'),
    warning_timeout: chrome.i18n.getMessage('network_timeout_faq_url_msgr'),
  },
  [ORIGIN_TYPE.WHATSAPP]: {
    about: chrome.i18n.getMessage('about_code_verify_faq_url_wa'),
    error: chrome.i18n.getMessage('validation_failure_faq_url_wa'),
    warning_risk: chrome.i18n.getMessage('possible_risk_detected_faq_url_wa'),
    warning_timeout: chrome.i18n.getMessage('network_timeout_faq_url_wa'),
  },
  [ORIGIN_TYPE.INSTAGRAM]: {
    about: chrome.i18n.getMessage('about_code_verify_faq_url_ig'),
    error: chrome.i18n.getMessage('validation_failure_faq_url_ig'),
    warning_risk: chrome.i18n.getMessage('possible_risk_detected_faq_url_ig'),
    warning_timeout: chrome.i18n.getMessage('network_timeout_faq_url_ig'),
  },
};

// doing this so we can add support for i18n using messages.json
function attachTextToHtml(): void {
  const i18nElements = document.querySelectorAll(`[id^="i18n"]`);
  Array.from(i18nElements).forEach(element => {
    element.innerHTML = chrome.i18n.getMessage(element.id);
  });
}

function attachMenuListeners(origin: Origin): void {
  document
    .getElementById('close_button')
    ?.addEventListener('click', () => window.close());

  const menuRows = document.getElementsByClassName('menu_row');

  menuRows[0].addEventListener('click', () => {
    chrome.tabs.create({url: ORIGIN_TO_LEARN_MORE_PAGES[origin].about});
  });

  menuRows[1].addEventListener('click', () => {
    updateDisplay('violation_list');
  });

  menuRows[2].addEventListener('click', () => updateDisplay('download'));

  menuRows[3].addEventListener('click', () => {
    sendMessageToActiveTab('downloadReleaseSource');
  });
}

function updateDisplay(state: State | PopupState): void {
  const popupState: PopupState =
    state in STATE_TO_POPUP_STATE
      ? STATE_TO_POPUP_STATE[state as State]
      : (state as PopupState);
  Array.from(document.getElementsByClassName('state_boundary')).forEach(
    (element: Element) => {
      if (element instanceof HTMLElement) {
        if (element.id == popupState) {
          element.style.display = 'block';
        } else {
          element.style.display = 'none';
        }
      }
    },
  );
}

function setUpBackgroundMessageHandler(tabId: string | null): void {
  if (tabId == null || tabId.trim() === '') {
    console.error('[Popup] No tab_id query param', document.location);
    return;
  }
  chrome.runtime.onMessage.addListener(message => {
    if (!('type' in message)) {
      return;
    }
    if (
      message.type === MESSAGE_TYPE.STATE_UPDATED &&
      message.tabId.toString() === tabId
    ) {
      updateDisplay(message.state);
    }
  });
}

function sendMessageToActiveTab(message: string): void {
  chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    const tabId = tabs[0].id;
    if (tabId) {
      chrome.tabs.sendMessage(tabId, {greeting: message}, () => {});
    }
  });
}

class PopupHeader extends HTMLElement {
  static observedAttributes = ['header-message'];

  connectedCallback() {
    const headerMessage = this.getAttribute('header-message');
    this.innerHTML = `
       <header>
        <span class="header_title">
          <img src="default_32.png" width="20px" height="20px" />
          ${
            headerMessage
              ? `
                <p class="header_label">
                  ${chrome.i18n.getMessage(headerMessage)}
                </p>
              `
              : ''
          }
        </span>
        <span class="menu_button">
          <object
            type="image/svg+xml"
            height="20px"
            width="20px"
            data="menu-badge.svg"></object>
        </span>
      </header>
    `;

    document.querySelectorAll('.menu_button')?.forEach(menuButton => {
      menuButton.addEventListener('click', () => {
        updateDisplay('menu');
      });
    });
  }
}

customElements.define('popup-header', PopupHeader);

class StateElement extends HTMLElement {
  static observedAttributes = [
    'inner-id',
    'type',
    'status-header',
    'status-message',
    'secondary-button-id',
    'primary-button-id',
    'primary-button-action',
    'secondary-button-id',
    'secondary-button-action',
    'tertiary-button-id',
    'tertiary-button-action',
    'header-message',
  ];

  connectedCallback() {
    const type = this.getAttribute('type');
    const innerId = this.getAttribute('inner-id')!;
    const headerMessage = this.getAttribute('header-message');
    const statusHeader = this.getAttribute('status-header');
    const statusMessage = this.getAttribute('status-message');
    const primaryButtonId = this.getAttribute('primary-button-id');
    const secondaryButtonId = this.getAttribute('secondary-button-id');
    const tertiaryButtonId = this.getAttribute('tertiary-button-id');
    const primaryButtonAction = this.getAttribute('primary-button-action');
    const secondaryButtonAction = this.getAttribute('secondary-button-action');
    const tertiaryButtonAction = this.getAttribute('tertiary-button-action');
    const primaryButton = primaryButtonId
      ? `<button
          id="${primaryButtonId}"
          class="button primary_button"
          type="button"></button>`
      : '';
    const secondaryButton = secondaryButtonId
      ? `<button
          id="${secondaryButtonId}"
          class="button secondary_button"
          type="button"></button>`
      : '';
    const tertiaryButton = tertiaryButtonId
      ? `<button
          id="${tertiaryButtonId}"
          class="button tertiary_button"
          type="button"></button>`
      : '';
    const actionBar =
      primaryButton || secondaryButton
        ? `<div class="action_bar">
              ${secondaryButton}
              ${tertiaryButton}
              ${primaryButton}
            </div>`
        : '';
    this.innerHTML = `
        <div class="state_boundary" id="${innerId}">
          <popup-header header-message=${headerMessage}></popup-header>
          <div class="content_body">
            ${
              type
                ? `<object
                    class="body_image"
                    type="image/svg+xml"
                    data="${type}-header.svg"></object>`
                : ''
            }
            ${
              statusHeader
                ? `<div id="${statusHeader}" class="status_header"></div>`
                : ''
            }
            ${
              statusMessage
                ? `<div id="${statusMessage}" class="status_message"></div>`
                : ''
            }
            ${actionBar}
          </div>
        </div>
    `;

    if (primaryButtonAction != null && primaryButtonId != null) {
      const button = document.getElementById(primaryButtonId);
      handleButtonAction(button!, primaryButtonAction, innerId);
    }
    if (secondaryButtonAction != null && secondaryButtonId != null) {
      const button = document.getElementById(secondaryButtonId);
      handleButtonAction(button!, secondaryButtonAction, innerId);
    }
    if (tertiaryButtonAction != null && tertiaryButtonId != null) {
      const button = document.getElementById(tertiaryButtonId);
      handleButtonAction(button!, tertiaryButtonAction, innerId);
    }
  }
}

const handleButtonAction = (
  button: HTMLElement,
  action: string,
  id: string,
) => {
  button?.addEventListener('click', () => {
    if (action === 'retry') {
      chrome.tabs.reload();
    } else if (action === 'learn_more') {
      chrome.tabs.create({
        url: ORIGIN_TO_LEARN_MORE_PAGES[currentOrigin][id],
      });
    } else if (action === 'download') {
      sendMessageToActiveTab('downloadSource');
    } else if (action === 'violations_list') {
      updateDisplay('violation_list');
    }
  });
};

customElements.define('state-element', StateElement);

let currentOrigin: Origin;

(function (): void {
  const params = new URL(document.location.href).searchParams;
  setUpBackgroundMessageHandler(params.get('tab_id'));
  const state = params.get('state') as State;
  updateDisplay(state);
  attachTextToHtml();
  currentOrigin = params.get('origin') as Origin;
  attachMenuListeners(currentOrigin);
})();
