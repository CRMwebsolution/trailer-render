import test from 'node:test';
import assert from 'node:assert/strict';
import { PhysicsMetrics } from '../core/PhysicsMetrics.js';

test('axle positions and the dimension overlay use the same finite coordinates', () => {
  for (const length of [10, 16, 20, 24, 30]) {
    const m = PhysicsMetrics.compute({ bedLengthFt: length });
    assert.equal(m.axleCentroidFromFrontIn, length * 12 * .6);
    assert(Math.abs(m.axleCentroidFromFrontM - m.axleCentroidFromFrontIn * .0254) < 1e-10);
    assert(Math.abs(m.axlePositionsM.reduce((a, b) => a + b) / m.axleCount - m.axleCentroidFromFrontM) < 1e-10);
  }
});
test('longer equipment ramps reduce the illustrated loading angle', () => {
  const a = PhysicsMetrics.compute({ rampLengthFt: 5, payloadClass: '20K' });
  const b = PhysicsMetrics.compute({ rampLengthFt: 8, payloadClass: '20K' });
  assert(b.rampAngleDeg < a.rampAngleDeg);
  assert(b.breakoverApexAngleDeg > a.breakoverApexAngleDeg);
});
test('the model never claims to verify vehicle clearance', () => {
  for (const width of [76, 83, 96, 102]) {
    const m = PhysicsMetrics.compute({ hitchStyle: 'gooseneck', trailerWidthIn: width });
    assert.equal(m.isEstimate, true);
    assert.equal(m.f250ClearanceStatus, 'NOT VERIFIED');
    assert(!Object.hasOwn(m, 'maxWheelbaseIn'));
  }
});
test('hidden flatbed ramp settings do not change dump or cargo estimated weight', () => {
  for (const trailerType of ['dump', 'cargo']) {
    const a = PhysicsMetrics.compute({ trailerType, rampLengthFt: 5, rampStyle: 'slide_in' });
    const b = PhysicsMetrics.compute({ trailerType, rampLengthFt: 8, rampStyle: 'fold_flat' });
    assert.equal(a.curbWeightLbs, b.curbWeightLbs);
    assert.equal(a.hasLoadingRamp, false);
  }
});
test('configuration extremes yield finite dimensions and nonnegative payload estimates', () => {
  for (const trailerType of ['flatbed', 'dump', 'cargo']) {
    for (const payloadClass of ['single', '10K', '14K', '20K', '25K']) {
      for (const bedLengthFt of [10, 30]) {
        const m = PhysicsMetrics.compute({ trailerType, payloadClass, bedLengthFt });
        for (const value of [m.bedLengthM, m.bedWidthM, m.deckHeightM, m.curbWeightLbs,
          m.axleCentroidFromFrontM, ...m.axlePositionsM]) assert(Number.isFinite(value));
        assert(m.payloadCapacityLbs >= 0);
        assert.equal(m.weightExceedsRating, m.curbWeightLbs > m.gvwrLbs);
      }
    }
  }
});
