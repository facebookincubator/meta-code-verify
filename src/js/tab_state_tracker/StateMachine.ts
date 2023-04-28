/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {State, STATES} from '../config';

// Table of possible transitions from one state to another. The entries for
// each transition can be:
//   (a) a boolean indicating if the transition to that state is valid
//   (b) another state to transition to should a transition to the 'from' state
//       is attempted.
const STATE_TRANSITIONS: Partial<{
  [key in State]: Partial<{[key in State]: boolean | State}>;
}> = {
  [STATES.START]: {
    [STATES.START]: true,
    [STATES.PROCESSING]: true,
    [STATES.IGNORE]: true,
  },
  [STATES.PROCESSING]: {
    [STATES.PROCESSING]: true,
    [STATES.INVALID]: true,
    [STATES.RISK]: true,
    [STATES.VALID]: true,
    [STATES.TIMEOUT]: true,
  },
  [STATES.IGNORE]: {
    [STATES.IGNORE]: true,
    [STATES.INVALID]: true,
    // Attempting to go from IGNORE to anything other than INVALID is bad and
    // should send you to an INVALID state. Either all frames in the tab are
    // being checked to some extent, or all should be ignored by the extension.
    // Nothing in between.
    [STATES.START]: STATES.INVALID,
    [STATES.PROCESSING]: STATES.INVALID,
    [STATES.RISK]: STATES.INVALID,
    [STATES.VALID]: STATES.INVALID,
    [STATES.TIMEOUT]: STATES.INVALID,
  },
  [STATES.INVALID]: {
    [STATES.INVALID]: true,
  },
  [STATES.RISK]: {
    [STATES.RISK]: true,
  },
  [STATES.VALID]: {
    [STATES.VALID]: true,
    [STATES.PROCESSING]: true,
    [STATES.INVALID]: true,
    [STATES.IGNORE]: STATES.INVALID,
  },
  [STATES.TIMEOUT]: {
    [STATES.TIMEOUT]: true,
  },
};

/**
 * State machine that transitions through the states listed above. This is used
 * to track the extension's state of the overall tab, and for individual frames
 * within that tab.
 */
export default class StateMachine {
  private _state: State;
  constructor() {
    this._state = STATES.START;
  }

  getState() {
    return this._state;
  }

  updateStateIfValid(newState: State) {
    // You messed up.
    if (!(newState in STATES)) {
      console.error('State', newState, 'does not exist!');
      this._setState(STATES.INVALID);
      return;
    }

    const skipState = STATE_TRANSITIONS[this._state][newState];
    if (typeof skipState === 'string') {
      this.updateStateIfValid(skipState);
      return;
    } else if (skipState) {
      this._setState(newState);
    }
  }

  _setState(newState: State) {
    const oldState = this._state;
    this._state = newState;
    if (oldState !== newState) {
      this.onStateUpdated();
    }
  }

  onStateUpdated() {}
}
