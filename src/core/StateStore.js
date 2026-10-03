import { PhysicsMetrics } from './PhysicsMetrics.js';
import { globalBus } from './EventBus.js';
import { normalizeConfig } from './config.js';

export class StateStore {
  constructor(initialState = {}) {
    this.state = normalizeConfig(initialState);
    this.metrics = PhysicsMetrics.compute(this.state);
    this.subscribers = new Set();
  }

  getState() { return { ...this.state }; }
  getMetrics() { return { ...this.metrics }; }

  update(partialState) {
    const next = normalizeConfig({ ...this.state, ...partialState }, partialState);
    if (Object.keys(next).every(key => Object.is(next[key], this.state[key]))) return;
    const previous = this.state;
    this.state = next;
    this.metrics = PhysicsMetrics.compute(next);
    this.notify(previous);
  }

  replace(state) { this.update(normalizeConfig(state)); }

  subscribe(callback) {
    this.subscribers.add(callback);
    callback(this.state, this.metrics, null);
    return () => this.subscribers.delete(callback);
  }

  notify(previous) {
    for (const callback of this.subscribers) {
      try { callback(this.state, this.metrics, previous); }
      catch (error) { console.error('Configuration update failed:', error); }
    }
    globalBus.emit('state:changed', {
      state: this.state, metrics: this.metrics, prevState: previous
    });
  }
}

export const store = new StateStore();
