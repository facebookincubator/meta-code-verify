import StateMachine from './StateMachine.js';

/**
 * Tracks the extension's state for each frame. It'll notify the overall tab's
 * state machine of any changes. The tab may or may not choose to apply those
 * changes based on the current states of the rest of its frames
 * (see TabStateMachine.js).
 */
export default class FrameStateMachine extends StateMachine {
  constructor(tabStateMachine) {
    super();
    this._tabStateMachine = tabStateMachine;
  }

  onStateUpdated() {
    this._tabStateMachine.updateStateIfValid(this.getState());
  }
}
