import test from 'node:test';
import assert from 'node:assert/strict';
import { measurementValues, formatDistance } from '../core/modelGeometry.js';
import { PhysicsMetrics } from '../core/PhysicsMetrics.js';
test('hitch-to-axle measures forward from the axle group, not rear overhang', () => {
  const m = PhysicsMetrics.compute({ bedLengthFt: 20 });
  assert(Math.abs(measurementValues(m).hitchToAxle - (12 * .3048 + 1.45)) < 1e-9);
  assert.equal(measurementValues(m, { min: { x: -1.5 }, max: { x: 8 } }).overallLength, 9.5);
});
test('measurement units convert without changing geometry', () => {
  assert.equal(formatDistance(.3048), '12 in');
  assert.equal(formatDistance(6.096), '20 ft 0 in');
  assert.equal(formatDistance(6.096, 'metric'), '6.10 m');
});
