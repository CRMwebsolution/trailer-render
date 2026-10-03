/**
 * StateStore.js
 * Central reactive store managing trailer configuration and calculated towing telemetry.
 */
import { PhysicsMetrics } from './PhysicsMetrics.js';
import { globalBus } from './EventBus.js';

export class StateStore {
  constructor(initialState = {}) {
    this.state = {
      // General Platform
      trailerType: 'flatbed',         // 'flatbed' | 'dump' | 'cargo'
      bedLengthFt: 20,                // 10 to 30 ft (step 1)
      trailerWidthIn: 83,             // 76, 83, 96, 102
      fenderStyle: 'regular',         // 'regular' | 'drive_over' | 'deck_over'
      payloadClass: '14K',            // 'single' | '10K' | '14K' | '20K' | '25K'
      hitchStyle: 'bumper_pull',      // 'bumper_pull' | 'gooseneck'
      deckMaterial: 'wood',           // 'wood' | 'diamond_plate'
      finishColor: '#27272a',         // Industrial powder coat black

      // Ramps (Flatbed)
      rampStyle: 'slide_in',          // 'slide_in' | 'fold_flat'
      rampLengthFt: 6.0,              // 5.0 to 8.0 ft
      rampPosition: 'deployed',       // 'stowed' | 'deployed' | 'standing'

      // Dump Trailer Specifics
      dumpBedPosition: 'lowered',     // 'lowered' | 'raised'
      dumpDoorStyle: 'barn',          // 'barn' | 'spreader'

      // Cargo Trailer Specifics
      cargoRearDoor: 'ramp',          // 'ramp' | 'barn'
      cargoSideDoor: true,            // 32" driver-side man door

      // Signage / Decals
      decalText: 'TITAN 14K',
      decalColor: '#f59e0b',          // High-vis gold

      // Viewport & Environment
      environmentMode: 'black',       // 'black' | 'white' | 'showroom'
      showTowTruck: false,            // 2016 Ford F-250 6.5ft bed
      showDimensions: true,
      cameraPreset: 'isometric',      // 'isometric' | 'side' | 'top' | 'hitch' | 'ramps'
      ...initialState
    };

    this.subscribers = new Set();
    this.metrics = PhysicsMetrics.compute(this.state);
  }

  getState() {
    return { ...this.state };
  }

  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Update configuration state and recompute physics metrics.
   * @param {Object} partialState 
   */
  update(partialState) {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...partialState };

    // Validation / Coercion
    this.state.bedLengthFt = Math.max(10, Math.min(30, Number(this.state.bedLengthFt)));
    this.state.rampLengthFt = Math.max(5.0, Math.min(8.0, Number(this.state.rampLengthFt)));
    this.state.trailerWidthIn = Number(this.state.trailerWidthIn || 83);

    // If deck_over or width is 102, ensure deck_over fender style
    if (this.state.trailerWidthIn === 102 && this.state.fenderStyle !== 'deck_over') {
      this.state.fenderStyle = 'deck_over';
    }

    // Recompute towing physics & clearances
    this.metrics = PhysicsMetrics.compute(this.state);

    // Notify listeners
    this.notify(prevState);
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    callback(this.state, this.metrics, null);
    return () => this.subscribers.delete(callback);
  }

  notify(prevState) {
    this.subscribers.forEach(cb => {
      try {
        cb(this.state, this.metrics, prevState);
      } catch (err) {
        console.error('Error in StateStore subscriber:', err);
      }
    });

    globalBus.emit('state:changed', {
      state: this.state,
      metrics: this.metrics,
      prevState
    });
  }
}

export const store = new StateStore();
