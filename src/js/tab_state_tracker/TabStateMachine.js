import { STATES } from '../config';

import StateMachine from './StateMachine.js';
import FrameStateMachine from './FrameStateMachine.js';

/**
 * Tracks the extension's state based on the states of the individual frames
 * in it.
 */
export default class TabStateMachine extends StateMachine {
  constructor(tabId) {
    super();
    this._tabId = tabId;
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
}
