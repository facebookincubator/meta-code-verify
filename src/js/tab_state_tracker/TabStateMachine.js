import { MESSAGE_TYPE, STATES, STATES_TO_ICONS } from '../config';

import StateMachine from './StateMachine.js';
import FrameStateMachine from './FrameStateMachine.js';

function getChromeV3Action() {
  if (self.chrome.runtime.getManifest().manifest_version >= 3) {
    return self.chrome.action;
  } else {
    return {
      setIcon: self.chrome.pageAction.setIcon,
      enable: self.chrome.pageAction.show,
      disable: self.chrome.pageAction.hide,
      setPopup: self.chrome.pageAction.setPopup,
    };
  }
}

/**
 * Tracks the extension's state based on the states of the individual frames
 * in it.
 */
export default class TabStateMachine extends StateMachine {
  constructor(tabId, origin) {
    super();
    this._tabId = tabId;
    this._origin = origin;
    this._frameStates = {};
  }

  addFrameStateMachine(frameId) {
    this._frameStates[frameId] = new FrameStateMachine(this);
  }

  updateStateForFrame(frameId, newState) {
    if (!(frameId in this._frameStates)) {
      throw new Error(
        `State machine for frame: ${frameId} does not exist for tab: ${this._tabId}`
      );
    }
    this._frameStates[frameId].updateStateIfValid(newState);
  }

  updateStateIfValid(newState) {
    // Only update the tab's state to VALID if all of it's frames are VALID
    if (
      newState === STATES.VALID &&
      !Object.values(this._frameStates).every(
        fsm => fsm.getState() === STATES.VALID
      )
    ) {
      return;
    }
    super.updateStateIfValid(newState);
  }

  onStateUpdated() {
    const state = this.getState();
    const chromeAction = getChromeV3Action();
    chromeAction.setIcon({
      tabId: this._tabId,
      path: STATES_TO_ICONS[state],
    });
    if (state === STATES.IGNORE || state === STATES.START) {
      chromeAction.disable(this._tabId);
    } else {
      chromeAction.enable(this._tabId);
      chromeAction.setPopup({
        tabId: this._tabId,
        popup: `popup.html?tab_id=${this._tabId}&state=${state}&origin=${this._origin}`,
      });
      // Broadcast state update for relevant popup to update its contents.
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPE.STATE_UPDATED,
        tabId: this._tabId,
        state,
      });
    }
  }
}
