import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig } from '../core/config.js';
import { PhysicsMetrics } from '../core/PhysicsMetrics.js';
import { computeLoadBalance } from '../core/loadBalance.js';
const compute = input => { const s = normalizeConfig({ loadPreset: 'custom', loadWeightLbs: 5000, ...input }), m = PhysicsMetrics.compute(s); return { m, b: computeLoadBalance(s, m) }; };
test('cargo at the axle centroid adds no hitch reaction and preserves force balance', () => {
  const { m, b } = compute({ loadCenterPct: 60 });
  assert(Math.abs(b.loadHitchLbs) < 1e-9);
  assert(Math.abs(b.hitchLbs - m.estimatedTongueWeightLbs) < 1e-9);
  assert.equal(b.hitchLbs + b.axleLbs, m.curbWeightLbs + 5000);
});
test('moving cargo aft reduces hitch support and can produce a negative reaction', () => {
  assert(compute({ loadCenterPct: 30 }).b.hitchLbs > compute({ loadCenterPct: 70 }).b.hitchLbs);
  assert(compute({ loadCenterPct: 100, loadWeightLbs: 20000 }).b.hitchLbs < 0);
});
test('hidden loads weigh zero and raised dump beds disable the level approximation', () => {
  const { m, b } = compute({ loadPreset: 'none' }); assert.equal(b.grossLbs, m.curbWeightLbs); assert(!b.enabled);
  assert(!compute({ trailerType: 'dump', dumpAngleDeg: 21 }).b.applicable);
});
