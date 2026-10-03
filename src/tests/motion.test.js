import test from 'node:test';
import assert from 'node:assert/strict';
import { StateStore } from '../core/StateStore.js';
import { normalizeConfig } from '../core/config.js';
test('old position buttons and new continuous values remain compatible', () => {
  const store = new StateStore({ trailerType: 'dump', dumpBedPosition: 'raised' });
  assert.equal(store.getState().dumpAngleDeg, 42);
  store.update({ dumpAngleDeg: 21 });
  assert.equal(store.getState().dumpBedPosition, 'custom');
  store.update({ dumpBedPosition: 'lowered' });
  assert.equal(store.getState().dumpAngleDeg, 0);
  store.update({ cargoDoorPosition: 'open' });
  assert.equal(store.getState().cargoDoorOpenPct, 100);
  store.update({ rampPosition: 'stowed' });
  assert.equal(store.getState().rampDeploymentPct, 0);
});
test('motion imported through saved designs remains finite and within the modeled range', () => {
  const state = normalizeConfig({ dumpAngleDeg: 200, cargoDoorOpenPct: -10, jackExtensionPct: NaN });
  assert.equal(state.dumpAngleDeg, 42); assert.equal(state.cargoDoorOpenPct, 0); assert.equal(state.jackExtensionPct, 100);
});
