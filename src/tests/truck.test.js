import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig } from '../core/config.js';
import { truckGeometry } from '../core/truckGeometry.js';
test('reference pickup geometry follows wheelbase, width and hitch offset independently', () => {
  const a = truckGeometry({}), b = truckGeometry({ truckWheelbaseIn: 180, truckWidthIn: 90, truckRearHitchOffsetIn: 60 });
  assert.equal(b.wheelbaseM, 180 * .0254); assert.equal(b.widthM, 90 * .0254); assert.equal(b.hitchOffsetM, 60 * .0254);
  assert(b.hoodEndX < a.hoodEndX); assert(b.cabLengthM > a.cabLengthM); assert(b.bedLengthM > a.bedLengthM);
});
test('truck assumptions and imported-model preferences normalize finite values', () => {
  const s = normalizeConfig({ truckWheelbaseIn: NaN, truckWidthIn: 500, customTruckOffsetM: Infinity, customTruckScalePct: -1, customTruckFlipped: true });
  assert.equal(s.truckWheelbaseIn, 156); assert.equal(s.truckWidthIn, 110); assert.equal(s.customTruckOffsetM, 0); assert.equal(s.customTruckScalePct, 50); assert(s.customTruckFlipped);
  assert(truckGeometry(s).cabLengthM > 0);
});
