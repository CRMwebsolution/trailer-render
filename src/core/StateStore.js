import { PhysicsMetrics } from './PhysicsMetrics.js';
import { globalBus } from './EventBus.js';
import { normalizeConfig } from './config.js';

export class StateStore {
  constructor(initialState = {}) {
    this.state = normalizeConfig(initialState);
    this.metrics = PhysicsMetrics.compute(this.state);
    this.subscribers = new Set();
    this.past = [];
    this.future = [];
    this.lastHistoryGroup = null;
  }

  getState() { return { ...this.state }; }
  getMetrics() { return { ...this.metrics }; }

  getHistory() { return { canUndo: this.past.length > 0, canRedo: this.future.length > 0 }; }

  update(partialState, { historyGroup = null, recordHistory = true } = {}) {
    const next = normalizeConfig({ ...this.state, ...partialState }, partialState);
    if (Object.keys(next).every(key => Object.is(next[key], this.state[key]))) return;
    const previous = this.state;
    if (recordHistory) {
      if (!historyGroup || historyGroup !== this.lastHistoryGroup) {
        this.past.push({ ...previous });
        if (this.past.length > 50) this.past.shift();
      }
      this.future = [];
      this.lastHistoryGroup = historyGroup;
    }
    this.state = next;
    this.metrics = PhysicsMetrics.compute(next);
    this.notify(previous);
  }

  replace(state) { this.update(normalizeConfig(state)); }

  undo() { return this.travel(this.past, this.future); }
  redo() { return this.travel(this.future, this.past); }
  travel(from, to) {
    if (!from.length) return false;
    const previous = this.state;
    to.push({ ...previous });
    this.state = from.pop();
    this.metrics = PhysicsMetrics.compute(this.state);
    this.lastHistoryGroup = null;
    this.notify(previous);
    return true;
  }

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
