/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

chrome.runtime.onMessage.addListener(message => {
  if (message && message.popup) {
    const state = message.popup.slice(message.popup.indexOf('=') + 1);
    updateDisplay(state);
  }
});

// doing this so we can add support for i18n using messages.json
function attachTextToHtml() {
  const i18nElements = document.querySelectorAll(`[id^="i18n"]`);
  Array.from(i18nElements).forEach(element => {
    element.innerHTML = chrome.i18n.getMessage(element.id);
  });
}

function attachListeners() {
  const menuButtonList = document.getElementsByClassName('menu');
  Array.from(menuButtonList).forEach(menuButton => {
    menuButton.addEventListener('click', () => updateDisplay('menu'));
  });

  const closeMenuButton = document.getElementById('close_menu');
  closeMenuButton.addEventListener('click', () => window.close());

  const menuRowList = document.getElementsByClassName('menu_row');
  menuRowList[0].addEventListener('click', () => {
    chrome.tabs.create({
      url: chrome.i18n.getMessage('about_code_verify_faq_url'),
    });
  });
  menuRowList[0].style.cursor = 'pointer';
  menuRowList[1].addEventListener('click', () => updateDisplay('download'));
  menuRowList[1].style.cursor = 'pointer';

  const downloadTextList = document.getElementsByClassName(
    'status_message_highlight'
  );
  downloadTextList[0].addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { greeting: 'downloadSource' },
        () => {}
      );
    });
  });
  downloadTextList[0].style.cursor = 'pointer';

  const downloadSrcButton = document.getElementById('download_source');

  downloadSrcButton.onclick = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { greeting: 'downloadSource' },
        () => {}
      );
    });
  };

  downloadSrcButton.style.cursor = 'pointer';

  downloadTextList[0].addEventListener('click', () =>
    updateDisplay('download')
  );
  downloadTextList[0].style.cursor = 'pointer';

  const learnMoreList = document.getElementsByClassName(
    'anomaly_learn_more_button'
  );
  learnMoreList[0].addEventListener('click', () => {
    chrome.tabs.create({
      url: chrome.i18n.getMessage('validation_failure_faq_url'),
    });
  });
  learnMoreList[0].style.cursor = 'pointer';

  const riskLearnMoreList = document.getElementsByClassName(
    'risk_learn_more_button'
  );
  riskLearnMoreList[0].addEventListener('click', () => {
    chrome.tabs.create({
      url: chrome.i18n.getMessage('possible_risk_detected_faq_url'),
    });
  });
  riskLearnMoreList[0].style.cursor = 'pointer';

  const retryButtonList = document.getElementsByClassName('retry_button');
  Array.from(retryButtonList).forEach(retryButton => {
    retryButton.addEventListener('click', () => {
      chrome.tabs.reload();
    });
    retryButton.style.cursor = 'pointer';
  });

  const timeoutLearnMoreList = document.getElementsByClassName(
    'timeout_learn_more_button'
  );
  timeoutLearnMoreList[0].addEventListener('click', () => {
    chrome.tabs.create({
      url: chrome.i18n.getMessage('network_timeout_faq_url'),
    });
  });
  timeoutLearnMoreList[0].style.cursor = 'pointer';
}

function updateDisplay(state) {
  Array.from(document.getElementsByClassName('state_boundary')).forEach(
    element => {
      if (element.id == state) {
        element.style.display = 'flex';
        document.body.className = state + '_body';
      } else {
        element.style.display = 'none';
      }
    }
  );
}

function loadUp() {
  const params = new URL(document.location).searchParams;
  const state = params.get('state');
  updateDisplay(state);
  attachTextToHtml();
  attachListeners();
}

loadUp();
