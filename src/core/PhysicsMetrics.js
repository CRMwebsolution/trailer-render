/**
 * PhysicsMetrics.js
 * Real-world towing calculations, clearance analysis, and weight distribution.
 */

export const PAYLOAD_CLASSES = {
  'single': {
    name: 'Single Axle (3.5K)',
    gvwrLbs: 3500,
    axleCount: 1,
    axleRatingLbs: 3500,
    wheelCount: 2,
    lugPattern: '5-Lug',
    tireSpec: 'ST205/75R15',
    tireRadiusIn: 13.5, // 27" diameter
    rimRadiusIn: 7.5,
    deckHeightIn: 21.0,
    mainBeamType: '4" Rect Tube',
    mainBeamDepthIn: 4.0,
    mainBeamFlangeIn: 2.0,
    linearWeightLbsPerFt: 18,
    gearWeightLbs: 380,
    deckOver: false
  },
  '10K': {
    name: '10K Tandem (9.9K GVWR)',
    gvwrLbs: 9990,
    axleCount: 2,
    axleRatingLbs: 5200,
    wheelCount: 4,
    lugPattern: '6-Lug',
    tireSpec: 'ST225/75R15',
    tireRadiusIn: 14.1, // 28.2" diameter
    rimRadiusIn: 7.5,
    deckHeightIn: 24.0,
    mainBeamType: '6" Structural Channel',
    mainBeamDepthIn: 6.0,
    mainBeamFlangeIn: 2.0,
    linearWeightLbsPerFt: 34,
    gearWeightLbs: 850,
    deckOver: false
  },
  '14K': {
    name: '14K Heavy Duty Tandem',
    gvwrLbs: 14000,
    axleCount: 2,
    axleRatingLbs: 7000,
    wheelCount: 4,
    lugPattern: '8-Lug',
    tireSpec: 'ST235/80R16 E-Rated',
    tireRadiusIn: 15.4, // 30.8" diameter
    rimRadiusIn: 8.0,
    deckHeightIn: 26.0,
    mainBeamType: '8" I-Beam (10 lb/ft)',
    mainBeamDepthIn: 8.0,
    mainBeamFlangeIn: 4.0,
    linearWeightLbsPerFt: 52,
    gearWeightLbs: 1380,
    deckOver: false
  },
  '20K': {
    name: '20K Tandem Duals (Deckover)',
    gvwrLbs: 20000,
    axleCount: 2,
    axleRatingLbs: 10000,
    wheelCount: 8, // Dual wheels per side
    lugPattern: '8-Lug Oil-Bath Duals',
    tireSpec: 'ST235/80R16 Duals',
    tireRadiusIn: 15.4,
    rimRadiusIn: 8.0,
    deckHeightIn: 34.0,
    mainBeamType: '10" Wide Flange I-Beam',
    mainBeamDepthIn: 10.0,
    mainBeamFlangeIn: 5.5,
    linearWeightLbsPerFt: 84,
    gearWeightLbs: 2450,
    deckOver: true
  },
  '25K': {
    name: '25K Heavy Equipment Triple / Dual Tandem',
    gvwrLbs: 25900,
    axleCount: 3,
    axleRatingLbs: 10000,
    wheelCount: 12, // Triple duals
    lugPattern: '10-Lug Oil-Bath Duals',
    tireSpec: '215/75R17.5 Heavy Commercial',
    tireRadiusIn: 15.1,
    rimRadiusIn: 8.75,
    deckHeightIn: 36.0,
    mainBeamType: '12" Heavy I-Beam Pierced Frame',
    mainBeamDepthIn: 12.0,
    mainBeamFlangeIn: 6.5,
    linearWeightLbsPerFt: 112,
    gearWeightLbs: 3600,
    deckOver: true
  }
};

// 2016 Ford F-250 SRW 6.5-ft Bed Benchmark Specifications
export const FORD_F250_65_SPECS = {
  model: '2016 Ford F-250 SRW Crew Cab 6.5ft Bed',
  bedLengthIn: 81.8,
  cabToBallDistanceIn: 43.0,     // Distance from gooseneck ball (over rear axle) to cab back wall
  ballToTailgateDistanceIn: 38.8,
  bedRailHeightGroundIn: 55.5,   // Ground to top of truck bed rails
  bedFloorHeightGroundIn: 35.0,  // Ground to truck bed floor
  bedDepthIn: 20.5,              // Bed interior depth
  bedWidthInsideIn: 66.9
};

export class PhysicsMetrics {
  /**
   * Calculates comprehensive physical dimensions, weights, towing clearances and angles.
   * @param {Object} config - Trailer configuration state
   */
  static compute(config) {
    const {
      trailerType = 'flatbed',
      bedLengthFt = 20,
      trailerWidthIn = 83,        // 76, 83, 96, 102
      fenderStyle = 'regular',    // 'regular' | 'drive_over' | 'deck_over'
      payloadClass = '14K',
      hitchStyle = 'bumper_pull', // 'bumper_pull' | 'gooseneck'
      deckMaterial = 'wood',      // 'wood' | 'diamond_plate'
      rampStyle = 'slide_in',     // 'slide_in' | 'fold_flat'
      rampLengthFt = 6.0,
      dumpBedPosition = 'lowered', // 'lowered' | 'raised'
      dumpDoorStyle = 'barn',      // 'barn' | 'spreader'
      cargoRearDoor = 'ramp',      // 'ramp' | 'barn'
      cargoSideDoor = true,
      decalText = ''
    } = config;

    const pClass = PAYLOAD_CLASSES[payloadClass] || PAYLOAD_CLASSES['14K'];

    // Determine deckOver flag
    const isDeckOver = fenderStyle === 'deck_over' || trailerWidthIn >= 102;
    const effectiveWidthIn = isDeckOver ? 102.0 : Number(trailerWidthIn || 83.0);
    const bedLengthIn = bedLengthFt * 12;
    const bedLengthM = bedLengthFt * 0.3048;
    const bedWidthIn = effectiveWidthIn;
    const bedWidthM = bedWidthIn * 0.0254;

    // Deck height adjusts based on fender / deck-over style
    const deckHeightIn = isDeckOver ? Math.max(34.0, pClass.deckHeightIn) : Math.min(26.0, pClass.deckHeightIn);
    const deckHeightM = deckHeightIn * 0.0254;

    // 1. AXLE PLACEMENT (60/40 RULE)
    // 60% of deck length forward of axle centroid, 40% rearward
    const axleCentroidFromFrontIn = bedLengthIn * 0.60;
    const axleCentroidFromFrontFt = bedLengthFt * 0.60;
    const axleCentroidFromFrontM = axleCentroidFromFrontIn * 0.0254;

    // Axle spread spacing based on axle count
    const axleSpreadIn = pClass.axleCount === 1 ? 0 : (pClass.axleCount === 2 ? 34.0 : 36.0);
    const axlePositionsIn = [];

    if (pClass.axleCount === 1) {
      axlePositionsIn.push(axleCentroidFromFrontIn);
    } else if (pClass.axleCount === 2) {
      axlePositionsIn.push(axleCentroidFromFrontIn - axleSpreadIn / 2);
      axlePositionsIn.push(axleCentroidFromFrontIn + axleSpreadIn / 2);
    } else if (pClass.axleCount === 3) {
      axlePositionsIn.push(axleCentroidFromFrontIn - axleSpreadIn);
      axlePositionsIn.push(axleCentroidFromFrontIn);
      axlePositionsIn.push(axleCentroidFromFrontIn + axleSpreadIn);
    }

    // 2. CURB WEIGHT & PAYLOAD CAPACITY
    // Frame steel weight
    const widthRatio = bedWidthIn / 83.0;
    const frameSteelWeight = pClass.linearWeightLbsPerFt * bedLengthFt * widthRatio;
    // Deck weight: wood (~3.8 lb/sqft) vs 3/16 diamond plate (~7.8 lb/sqft)
    const deckAreaSqFt = bedLengthFt * (bedWidthIn / 12);
    const deckWeightPerSqFt = deckMaterial === 'wood' ? 3.8 : 7.8;
    const deckWeight = deckAreaSqFt * deckWeightPerSqFt;
    // Hitch structure weight
    const hitchWeight = hitchStyle === 'bumper_pull' ? (pClass.linearWeightLbsPerFt * 4.5 + 120) : (pClass.linearWeightLbsPerFt * 9.0 + 550);
    // Ramp weight
    const rampWeight = rampStyle === 'slide_in' ? (rampLengthFt * 28) : 260;
    // Dump box & hydraulics bonus weight if dump trailer
    const dumpBonusWeight = trailerType === 'dump' ? (bedLengthFt * 65 + 680) : 0;
    // Cargo enclosure bonus weight if cargo trailer
    const cargoBonusWeight = trailerType === 'cargo' ? (bedLengthFt * 50 + 450) : 0;

    const curbWeightLbs = Math.round(frameSteelWeight + deckWeight + pClass.gearWeightLbs + hitchWeight + rampWeight + dumpBonusWeight + cargoBonusWeight);
    const payloadCapacityLbs = Math.max(0, pClass.gvwrLbs - curbWeightLbs);

    // Tongue Weight Estimation
    const tongueWeightPct = hitchStyle === 'bumper_pull' ? 12.5 : 22.0;
    const estimatedTongueWeightLbs = Math.round(curbWeightLbs * (tongueWeightPct / 100));

    // 3. TOWING CLEARANCES
    // Bumper Pull Coupler: exactly 18-20 inches to level with standard 3/4-ton receiver
    const bumperPullCouplerHeightIn = 19.0;

    // Gooseneck Geometry & 2016 Ford F-250 6.5ft Cab Clearance
    const gooseneckCouplerHeightIn = 35.0;
    const gooseneckUnderbeamHeightIn = 63.5;
    const f250BedRailClearanceIn = gooseneckUnderbeamHeightIn - FORD_F250_65_SPECS.bedRailHeightGroundIn;
    const gooseneckSwingRadiusIn = 35.5; // Radius to outermost front corner
    const f250CabClearanceMarginIn = FORD_F250_65_SPECS.cabToBallDistanceIn - gooseneckSwingRadiusIn;

    let f250ClearanceStatus = 'SAFE';
    let f250StatusColor = '#22c55e'; // Green
    if (f250CabClearanceMarginIn < 0) {
      f250ClearanceStatus = 'COLLISION RISK';
      f250StatusColor = '#ef4444'; // Red
    } else if (f250CabClearanceMarginIn < 4.0) {
      f250ClearanceStatus = 'TIGHT CLEARANCE';
      f250StatusColor = '#f59e0b'; // Amber
    }

    // 4. RAMP APPROACH & BREAKOVER ANGLES
    const hasDovetail = (trailerType === 'flatbed' && bedLengthFt >= 16);
    const dovetailLengthIn = hasDovetail ? 36.0 : 0;
    const dovetailDropIn = hasDovetail ? 4.5 : 0;
    const dovetailAngleDeg = hasDovetail ? Math.atan(dovetailDropIn / dovetailLengthIn) * (180 / Math.PI) : 0;

    const rearDeckLipHeightIn = deckHeightIn - dovetailDropIn;
    const actualRampLengthIn = rampStyle === 'slide_in' ? (rampLengthFt * 12) : 60.0;

    const rampRatio = Math.min(1.0, rearDeckLipHeightIn / actualRampLengthIn);
    const rampAngleRad = Math.asin(rampRatio);
    const rampAngleDeg = rampAngleRad * (180 / Math.PI);
    const breakoverApexAngleDeg = 180.0 - (rampAngleDeg - dovetailAngleDeg);
    const maxWheelbaseIn = (2 * 4.0) / Math.tan((rampAngleDeg * Math.PI) / 360);

    return {
      // Identity & Ratings
      trailerType,
      payloadClass,
      payloadClassName: pClass.name,
      gvwrLbs: pClass.gvwrLbs,
      curbWeightLbs,
      payloadCapacityLbs,
      estimatedTongueWeightLbs,
      tongueWeightPct,

      // Dimensions (Imperial & Metric)
      bedLengthFt,
      bedLengthIn,
      bedLengthM,
      trailerWidthIn: effectiveWidthIn,
      bedWidthIn,
      bedWidthM,
      deckHeightIn,
      deckHeightM,
      fenderStyle,
      deckOver: isDeckOver,
      mainBeamType: pClass.mainBeamType,
      mainBeamDepthIn: pClass.mainBeamDepthIn,

      // Axle Kinematics (60/40 Distribution)
      axleCount: pClass.axleCount,
      axleRatingLbs: pClass.axleRatingLbs,
      wheelCount: pClass.wheelCount,
      lugPattern: pClass.lugPattern,
      tireSpec: pClass.tireSpec,
      tireRadiusIn: pClass.tireRadiusIn,
      tireRadiusM: pClass.tireRadiusIn * 0.0254,
      axleCentroidFromFrontIn,
      axleCentroidFromFrontFt,
      axleCentroidPct: 60.0,
      axlePositionsIn,
      axlePositionsM: axlePositionsIn.map(pos => pos * 0.0254),

      // Hitch & Truck Clearances
      hitchStyle,
      couplerHeightIn: hitchStyle === 'bumper_pull' ? bumperPullCouplerHeightIn : gooseneckCouplerHeightIn,
      f250Specs: FORD_F250_65_SPECS,
      f250BedRailClearanceIn,
      f250SwingRadiusIn: gooseneckSwingRadiusIn,
      f250CabClearanceMarginIn,
      f250ClearanceStatus,
      f250StatusColor,

      // Ramp & Loading Kinematics
      rampStyle,
      rampLengthFt: rampStyle === 'slide_in' ? rampLengthFt : 5.0,
      hasDovetail,
      dovetailLengthIn,
      dovetailDropIn,
      dovetailAngleDeg,
      rearDeckLipHeightIn,
      rampAngleDeg: Number(rampAngleDeg.toFixed(1)),
      breakoverApexAngleDeg: Number(breakoverApexAngleDeg.toFixed(1)),
      maxWheelbaseIn: Math.round(maxWheelbaseIn),

      // Dump Trailer Specifics
      dumpBedPosition,
      dumpDoorStyle,

      // Cargo Trailer Specifics
      cargoRearDoor,
      cargoSideDoor,

      // Decals
      decalText
    };
  }
}
