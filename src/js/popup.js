import { MESSAGE_TYPE } from './config.js';

let debugUrl = '';

chrome.runtime.onMessage.addListener(message => {
  if (message && message.popup) {
    const state = message.popup.slice(message.popup.indexOf('=') + 1);
    updateDisplay(state);
  }

  if (message && message.senderUrl) {
    debugUrl = message.senderUrl;
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
  menuRowList[0].style.cursor = 'not-allowed';
  menuRowList[1].addEventListener('click', () => updateDisplay('download'));
  menuRowList[1].style.cursor = 'pointer';
  menuRowList[2].addEventListener('click', () => updateDisplay('debug'));
  menuRowList[2].style.cursor = 'pointer';

  const downloadTextList = document.getElementsByClassName(
    'status_message_highlight'
  );
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

  const reportBugButton = document.getElementsByClassName(
    'report_issue_button'
  );
  reportBugButton[0].addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabList => {
      chrome.runtime.sendMessage(
        {
          type: MESSAGE_TYPE.GET_DEBUG,
          tabId: tabList[0].id,
        },
        response => {
          const debugList = response.debugList;
          console.log('debug url is ', debugUrl);
          console.log('debug info is ', debugList.join('\n'));
          const default_responses = {
            bug_url: debugUrl,
            useragent: window.navigator.userAgent,
            debuginfo: window.btoa(debugList.join('\n')),
          };
          const reportBugURL =
            'https://www.internalfb.com/butterfly/form/3045948462349251?default_responses=' +
            JSON.stringify(default_responses);
          chrome.tabs.create({ url: reportBugURL });
        }
      );
    });
  });
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
