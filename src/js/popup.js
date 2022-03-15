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
      url: 'https://faq.whatsapp.com/web/security-and-privacy/about-code-verify',
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
      url: 'https://faq.whatsapp.com/web/security-and-privacy/why-am-i-seeing-a-validation-failure-warning',
    });
  });
  learnMoreList[0].style.cursor = 'pointer';

  const riskLearnMoreList = document.getElementsByClassName(
    'risk_learn_more_button'
  );
  riskLearnMoreList[0].addEventListener('click', () => {
    chrome.tabs.create({
      url: 'https://faq.whatsapp.com/web/security-and-privacy/why-am-i-seeing-a-possible-risk-detected-warning',
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
      url: 'https://faq.whatsapp.com/web/security-and-privacy/why-am-i-seeing-a-network-timeout-error',
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
  attachListeners();
}

loadUp();
