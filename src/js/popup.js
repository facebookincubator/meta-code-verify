const debugList = ['problem 1', 'problem 2', 'problem 3'];

chrome.runtime.onMessage.addListener(message => {
  if (message && message.popup) {
    const state = message.popup.slice(message.popup.indexOf('=') + 1);
    console.log('state from listener is ', state);
    updateDisplay(state);
  }

  if (message && message.debugMessage) {
    debugList.push(message.debugMessage);
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
  menuRowList[1].style.cursor = 'not-allowed';
  menuRowList[2].addEventListener('click', () => updateDisplay('debug'));
  menuRowList[2].style.cursor = 'pointer';

  const reportBugButton = document.getElementsByClassName(
    'report_issue_button'
  );
  reportBugButton[0].addEventListener('click', () => {
    const default_responses = {
      bug_url: document.location,
      useragent: window.navigator.userAgent,
      debuginfo: debugList.join('\n'),
    };
    const reportBugURL =
      'https://www.internalfb.com/butterfly/form/3045948462349251?default_responses=' +
      JSON.stringify(default_responses);
    chrome.tabs.create({ url: reportBugURL });
  });
}

function updateDisplay(state) {
  Array.from(document.getElementsByClassName('state_boundary')).forEach(
    element => {
      if (element.id == state) {
        element.style.display = 'flex';
        document.body.class = state + '_body';
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
