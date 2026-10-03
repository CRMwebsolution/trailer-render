import { PhysicsMetrics, PAYLOAD_CLASSES, FORD_F250_65_SPECS } from '../core/PhysicsMetrics.js';

console.log('--- RUNNING TOWING PHYSICS & CLEARANCE UNIT TESTS ---');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ TEST FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

// 1. Test 60/40 Axle Centroid Rule
[10, 16, 20, 24, 30].forEach(lengthFt => {
  const metrics = PhysicsMetrics.compute({ bedLengthFt: lengthFt, payloadClass: '14K' });
  const expectedCentroidIn = lengthFt * 12 * 0.60;
  assert(
    Math.abs(metrics.axleCentroidFromFrontIn - expectedCentroidIn) < 0.001,
    `60/40 rule holds for ${lengthFt}ft bed: Centroid at ${metrics.axleCentroidFromFrontIn} inches`
  );
});

// 2. Test Payload Classes & Axle Counts
const singleMetrics = PhysicsMetrics.compute({ bedLengthFt: 14, payloadClass: 'single' });
assert(singleMetrics.axleCount === 1, 'Single axle class has 1 axle');
assert(singleMetrics.axlePositionsIn.length === 1, 'Single axle positions array length is 1');

const tandemMetrics = PhysicsMetrics.compute({ bedLengthFt: 20, payloadClass: '14K' });
assert(tandemMetrics.axleCount === 2, '14K class has 2 tandem axles');
assert(tandemMetrics.axlePositionsIn.length === 2, 'Tandem axle positions array length is 2');
assert(
  Math.abs((tandemMetrics.axlePositionsIn[0] + tandemMetrics.axlePositionsIn[1]) / 2 - tandemMetrics.axleCentroidFromFrontIn) < 0.001,
  'Tandem axle group centers exactly at the 60% mark'
);

const tripleMetrics = PhysicsMetrics.compute({ bedLengthFt: 28, payloadClass: '25K' });
assert(tripleMetrics.axleCount === 3, '25K class has 3 axles');
assert(tripleMetrics.wheelCount === 12, '25K dual-tandem/triple has 12 wheels total');

// 3. Test Hitch Clearances
const bpMetrics = PhysicsMetrics.compute({ hitchStyle: 'bumper_pull' });
assert(bpMetrics.couplerHeightIn >= 18 && bpMetrics.couplerHeightIn <= 20, 'Bumper pull coupler height is between 18 and 20 inches');

const gnMetrics = PhysicsMetrics.compute({ hitchStyle: 'gooseneck' });
assert(gnMetrics.f250BedRailClearanceIn >= 7.0, 'Gooseneck clears Ford F-250 bed rails by at least 7 inches');
assert(gnMetrics.f250CabClearanceMarginIn > 0, `Gooseneck clears Ford F-250 cab with margin: ${gnMetrics.f250CabClearanceMarginIn} in`);

// 4. Test Ramp Approach and Breakover Angles
const steepRamp = PhysicsMetrics.compute({ bedLengthFt: 20, payloadClass: '20K', rampStyle: 'slide_in', rampLengthFt: 5.0 });
const gentleRamp = PhysicsMetrics.compute({ bedLengthFt: 20, payloadClass: '20K', rampStyle: 'slide_in', rampLengthFt: 8.0 });
assert(gentleRamp.rampAngleDeg < steepRamp.rampAngleDeg, 'Longer ramp provides gentler approach angle');
assert(gentleRamp.breakoverApexAngleDeg > steepRamp.breakoverApexAngleDeg, 'Gentler ramp gives flatter (higher apex) breakover clearance angle');

// 5. Test Widths & Deck-Over Styles
const w76 = PhysicsMetrics.compute({ trailerWidthIn: 76 });
assert(w76.bedWidthIn === 76, 'Width 76 inches is respected');

const w102 = PhysicsMetrics.compute({ trailerWidthIn: 102 });
assert(w102.bedWidthIn === 102, 'Width 102 inches is respected');
assert(w102.deckOver === true, '102 width is treated as deck-over (over wheels)');
assert(w102.deckHeightIn > w76.deckHeightIn, 'Deck-over elevation is higher than standard low-bed');

// 6. Test Dump & Cargo Platform Specifics
const dumpMetrics = PhysicsMetrics.compute({ trailerType: 'dump', bedLengthFt: 14, payloadClass: '14K' });
assert(dumpMetrics.curbWeightLbs > tandemMetrics.curbWeightLbs * 0.7, 'Dump trailer includes steel dump box tare weight');

const cargoMetrics = PhysicsMetrics.compute({ trailerType: 'cargo', bedLengthFt: 20, payloadClass: '10K' });
assert(cargoMetrics.curbWeightLbs > 3000, 'Cargo trailer includes enclosure box tare weight');

console.log('--- ALL PHYSICS TESTS PASSED CLEANLY ---');
