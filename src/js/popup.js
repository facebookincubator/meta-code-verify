chrome.runtime.onMessage.addListener(message => {
  const state = message.popup.slice(message.popup.indexOf('=') + 1);
  console.log('state from listener is ', state);
  updateDisplay(state);
});

function attachListeners() {
  const menuButtonList = document.getElementsByClassName('menu');
  menuButtonList[0].addEventListener('click', () => updateDisplay('menu'));
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
