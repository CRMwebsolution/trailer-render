import test from 'node:test';
import assert from 'node:assert/strict';
import { StateStore } from '../core/StateStore.js';

test('undo and redo restore normalized dependent configuration together', () => {
  const store = new StateStore();
  store.update({ payloadClass: '20K' });
  assert.equal(store.getState().trailerWidthIn, 102);
  assert(store.undo());
  assert.equal(store.getState().trailerWidthIn, 83);
  assert(store.redo());
  assert.equal(store.getState().payloadClass, '20K');
});
test('a slider gesture is one undo step and a new edit clears redo', () => {
  const store = new StateStore();
  const historyGroup = Symbol('gesture');
  for (const bedLengthFt of [21, 22, 25]) store.update({ bedLengthFt }, { historyGroup });
  store.undo();
  assert.equal(store.getState().bedLengthFt, 20);
  store.update({ bedLengthFt: 20 });
  assert(store.getHistory().canRedo);
  store.update({ bedLengthFt: 24 });
  assert(!store.getHistory().canRedo);
});
test('history is bounded and caller snapshots cannot mutate it', () => {
  const store = new StateStore();
  for (let i = 0; i < 80; i++) store.update({ decalText: String(i) });
  const snapshot = store.getState(); snapshot.decalText = 'changed outside';
  let count = 0; while (store.undo()) count++;
  assert.equal(count, 50);
  assert.equal(store.getState().decalText, '29');
});
