/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  MESSAGE_TYPE,
  Origin,
  State,
  STATES,
  STATES_TO_ICONS,
  ORIGIN_HOST,
} from '../../config';

import StateMachine from './StateMachine';
import FrameStateMachine from './FrameStateMachine';
import {sendMessageToBackground} from '../../shared/sendMessageToBackground';

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
  private _tabId: number;
  private _origin: Origin;
  private _frameStates: {[key: number]: FrameStateMachine};

  constructor(tabId: number, origin: Origin) {
    super();
    this._tabId = tabId;
    this._origin = origin;
    this._frameStates = {};
  }

  addFrameStateMachine(frameId: number) {
    this._frameStates[frameId] = new FrameStateMachine(this);
  }

  updateStateForFrame(frameId: number, newState: State): void {
    if (!(frameId in this._frameStates)) {
      this._frameStates[frameId].updateStateIfValid('INVALID');
      throw new Error(
        `State machine for frame: ${frameId} does not exist for tab: ${this._tabId}`,
      );
    }
    this._frameStates[frameId].updateStateIfValid(newState);
  }

  updateStateIfValid(newState: State) {
    // Only update the tab's state to VALID if all of it's frames are VALID or just starting
    if (
      newState === STATES.VALID &&
      !Object.values(this._frameStates).every(
        fsm =>
          fsm.getState() === STATES.VALID || fsm.getState() === STATES.START,
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
    chromeAction.enable(this._tabId);
    chromeAction.setPopup({
      tabId: this._tabId,
      popup: `popup.html?tab_id=${this._tabId}&state=${state}&origin=${this._origin}`,
    });
    // Broadcast state update for relevant popup to update its contents.
    sendMessageToBackground(
      {
        type: MESSAGE_TYPE.STATE_UPDATED,
        tabId: this._tabId,
        state,
      },
      () => {
        /**
         * The following suppresses an error that is thrown when we try to
         * send this message to popup.js before it's listener is set up.
         *
         * For more details on how this suppresses the error:
         * See: https://stackoverflow.com/questions/28431505/unchecked-runtime-lasterror-when-using-chrome-api/28432087#28432087
         */
        chrome.runtime.lastError && chrome.runtime.lastError.message;
      },
    );
    if (state === STATES.IGNORE) {
      this.genDisableTab();
    }
  }

  private async genDisableTab(): Promise<void> {
    const tab = await chrome.tabs.get(this._tabId);
    if (tab.url) {
      const host = new URL(tab.url).hostname.replace('www.', '');
      if (Object.values(ORIGIN_HOST).includes(host)) {
        this.updateStateIfValid(STATES.INVALID);
        return;
      }
    }
    getChromeV3Action().disable(this._tabId);
  }
}
