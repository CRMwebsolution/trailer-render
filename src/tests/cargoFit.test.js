import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig } from '../core/config.js';
import { PhysicsMetrics } from '../core/PhysicsMetrics.js';
import { computeCargoFit } from '../core/cargoFit.js';
const fit = config => { const s = normalizeConfig({ loadPreset: 'custom', ...config }); return computeCargoFit(s, PhysicsMetrics.compute(s)); };

test('load clearance responds to position, rotation and overhang', () => {
  assert(fit({ loadLengthFt: 15, loadWidthIn: 72 }).fits);
  assert(!fit({ loadLengthFt: 15, loadCenterPct: 90 }).fits);
  assert(!fit({ loadLengthFt: 15, loadYawDeg: 90 }).fits);
  assert(!fit({ loadLateralIn: 40 }).fits);
});
test('cargo roof and door opening are separate envelope constraints', () => {
  const narrowMargin = fit({ trailerType: 'cargo', loadLengthFt: 10, loadWidthIn: 81, loadHeightIn: 60 });
  assert(narrowMargin.fits); assert.equal(narrowMargin.doorFits, false);
  assert(!fit({ trailerType: 'cargo', loadHeightIn: 100 }).fits);
});
test('dump wall thickness reduces its clear width and corrupt load inputs remain finite', () => {
  assert(!fit({ trailerType: 'dump', loadWidthIn: 81 }).fits);
  const s = normalizeConfig({ loadLengthFt: Infinity, loadHeightIn: -200, loadYawDeg: 'bad' });
  assert.equal(s.loadLengthFt, 15); assert.equal(s.loadHeightIn, 6);
  assert(Number.isFinite(fit(s).sideGap));
});
