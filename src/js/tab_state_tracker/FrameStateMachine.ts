import StateMachine from './StateMachine';
import TabStateMachine from './TabStateMachine';

/**
 * Tracks the extension's state for each frame. It'll notify the overall tab's
 * state machine of any changes. The tab may or may not choose to apply those
 * changes based on the current states of the rest of its frames
 * (see TabStateMachine.ts).
 */
export default class FrameStateMachine extends StateMachine {
  private _tabStateMachine: TabStateMachine;

  constructor(tabStateMachine: TabStateMachine) {
    super();
    this._tabStateMachine = tabStateMachine;
  }

  onStateUpdated() {
    this._tabStateMachine.updateStateIfValid(this.getState());
  }
}
