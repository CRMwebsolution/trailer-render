/**
 * FlatbedTrailer.js
 * High-fidelity procedural flatbed/equipment trailer generator.
 * Extends BaseTrailer to proceduralize structural I-beams, crossmembers, rub rails,
 * wood/steel decking, A-frame vs Gooseneck hitches, and adjustable/fold-flat ramps.
 */
import * as THREE from 'three';
import { BaseTrailer } from './BaseTrailer.js';
import { decalFactory } from '../scene/DecalFactory.js';

export class FlatbedTrailer extends BaseTrailer {
  constructor(scene, materialFactory) {
    super(scene, materialFactory);
  }

  /**
   * Builds the structural steel frame (main rails, crossmembers, rub rails, dovetail).
   */
  buildFrame(config, metrics) {
    const {
      bedLengthM,
      bedWidthM,
      deckHeightM,
      mainBeamDepthIn,
      hasDovetail,
      dovetailLengthIn,
      dovetailDropIn,
      payloadClass
    } = metrics;

    const frameColor = config.finishColor || '#27272a';
    const frameMat = this.materials.getMaterial('frame_steel', { color: frameColor });
    const dotTapeMat = this.materials.getMaterial('dot_tape', { repeatX: Math.round(metrics.bedLengthFt * 1.5) });

    const beamDepthM = mainBeamDepthIn * 0.0254;
    const beamFlangeM = beamDepthM * 0.45;
    const beamWebThickM = 0.012;

    const dovetailLengthM = (dovetailLengthIn || 0) * 0.0254;
    const dovetailDropM = (dovetailDropIn || 0) * 0.0254;
    const flatLengthM = bedLengthM - dovetailLengthM;

    // Main longitudinal rails (Left & Right)
    const railZOffset = metrics.deckOver ? (bedWidthM / 2 - 0.25) : (bedWidthM / 2 - 0.06);

    [-1, 1].forEach(side => {
      const zPos = side * railZOffset;

      // 1. Flat section of main beam
      const flatBeam = this.createIBeam(flatLengthM, beamDepthM, beamFlangeM, beamWebThickM, frameMat);
      flatBeam.position.set(flatLengthM / 2, deckHeightM - beamDepthM / 2, zPos);
      this.chassisGroup.add(flatBeam);

      // 2. Dovetail sloped section (if equipped)
      if (hasDovetail) {
        const dovetailHypotenuse = Math.sqrt(dovetailLengthM * dovetailLengthM + dovetailDropM * dovetailDropM);
        const dovetailAngle = Math.atan2(dovetailDropM, dovetailLengthM);
        const slopedBeam = this.createIBeam(dovetailHypotenuse, beamDepthM, beamFlangeM, beamWebThickM, frameMat);
        slopedBeam.rotation.z = -dovetailAngle;
        slopedBeam.position.set(
          flatLengthM + (dovetailLengthM / 2),
          deckHeightM - (dovetailDropM / 2) - (beamDepthM / 2),
          zPos
        );
        this.chassisGroup.add(slopedBeam);
      }
    });

    // 3. Junior Crossmembers spaced at 16" (0.406m) or 12" (0.305m)
    const crossSpacingM = (payloadClass === '20K' || payloadClass === '25K') ? 0.305 : 0.406;
    const crossWidth = (railZOffset * 2) - 0.04;

    for (let x = 0.4; x < flatLengthM; x += crossSpacingM) {
      const crossGeo = new THREE.BoxGeometry(0.06, beamDepthM * 0.55, crossWidth);
      const crossMesh = new THREE.Mesh(crossGeo, frameMat);
      crossMesh.position.set(x, deckHeightM - (beamDepthM * 0.55 / 2), 0);
      crossMesh.castShadow = true;
      this.chassisGroup.add(crossMesh);
    }

    // 4. Front Frame Header Crossmember (sealing front of trailer)
    const frontHeaderGeo = new THREE.BoxGeometry(0.08, beamDepthM, bedWidthM);
    const frontHeader = new THREE.Mesh(frontHeaderGeo, frameMat);
    frontHeader.position.set(0.04, deckHeightM - beamDepthM / 2, 0);
    frontHeader.castShadow = true;
    this.chassisGroup.add(frontHeader);

    // 5. Outer Rub Rails with Stake Pockets and DOT Tape
    [-1, 1].forEach(side => {
      const outerZ = side * (bedWidthM / 2);

      // Longitudinal outer channel
      const rubRailGeo = new THREE.BoxGeometry(bedLengthM, 0.08, 0.04);
      const rubRailMesh = new THREE.Mesh(rubRailGeo, frameMat);
      rubRailMesh.position.set(bedLengthM / 2, deckHeightM - 0.04, outerZ);
      rubRailMesh.castShadow = true;
      this.chassisGroup.add(rubRailMesh);

      // DOT C2 Reflective Tape Strip on outer rail
      const tapeGeo = new THREE.PlaneGeometry(bedLengthM * 0.95, 0.04);
      if (side < 0) tapeGeo.rotateY(Math.PI);
      const tapeMesh = new THREE.Mesh(tapeGeo, dotTapeMat);
      tapeMesh.position.set(bedLengthM / 2, deckHeightM - 0.04, outerZ + (side * 0.021));
      this.chassisGroup.add(tapeMesh);

      // Stake pockets every 2 feet (0.61m)
      const pocketShape = new THREE.Shape();
      pocketShape.moveTo(-.04, -.027); pocketShape.lineTo(.04, -.027); pocketShape.lineTo(.04, .027); pocketShape.lineTo(-.04, .027); pocketShape.closePath();
      const pocketHole = new THREE.Path();
      pocketHole.moveTo(-.032, -.020); pocketHole.lineTo(-.032, .020); pocketHole.lineTo(.032, .020); pocketHole.lineTo(.032, -.020); pocketHole.closePath(); pocketShape.holes.push(pocketHole);
      const pocketGeo = new THREE.ExtrudeGeometry(pocketShape, { depth: .10, bevelEnabled: false, steps: 1 }); pocketGeo.rotateX(Math.PI / 2);
      for (let px = 0.6; px < bedLengthM - 0.3; px += 0.61) {
        const pocketMesh = new THREE.Mesh(pocketGeo, frameMat);
        pocketMesh.position.set(px, deckHeightM + .01, outerZ + (side * 0.035));
        pocketMesh.castShadow = true;
        this.chassisGroup.add(pocketMesh);
      }

      // Custom Signage Decal Badge on outer rail
      if (config.decalText && config.decalText.trim().length > 0) {
        const decalMesh = decalFactory.createDecalMesh(config.decalText, config.decalColor || '#f59e0b', 1.2, 0.16);
        if (side < 0) decalMesh.rotateY(Math.PI);
        decalMesh.position.set(bedLengthM * 0.25, deckHeightM - 0.04, outerZ + (side * 0.024));
        this.chassisGroup.add(decalMesh);
      }
    });

    // 6. Rear Dovetail Bumper / Transition Plate
    const rearBumperGeo = new THREE.BoxGeometry(0.08, 0.10, bedWidthM);
    const rearBumper = new THREE.Mesh(rearBumperGeo, frameMat);
    rearBumper.position.set(bedLengthM - 0.04, deckHeightM - dovetailDropM - 0.05, 0);
    rearBumper.castShadow = true;
    this.chassisGroup.add(rearBumper);
  }

  /**
   * Helper to construct realistic structural I-Beam geometry.
   */
  createIBeam(lengthM, depthM, flangeM, webThickM, material) {
    const group = new THREE.Group();
    const flangeThickM = 0.015;

    // Top Flange
    const topFlangeGeo = new THREE.BoxGeometry(lengthM, flangeThickM, flangeM);
    const topFlange = new THREE.Mesh(topFlangeGeo, material);
    topFlange.position.set(0, (depthM / 2) - (flangeThickM / 2), 0);
    topFlange.castShadow = true;
    group.add(topFlange);

    // Bottom Flange
    const botFlange = new THREE.Mesh(topFlangeGeo, material);
    botFlange.position.set(0, -(depthM / 2) + (flangeThickM / 2), 0);
    botFlange.castShadow = true;
    group.add(botFlange);

    // Center Web
    const webGeo = new THREE.BoxGeometry(lengthM, depthM - (flangeThickM * 2), webThickM);
    const webMesh = new THREE.Mesh(webGeo, material);
    webMesh.castShadow = true;
    group.add(webMesh);

    return group;
  }

  /**
   * Procedural decking: Treated wood planks vs Diamond plate steel.
   */
  buildDeck(config, metrics) {
    const {
      bedLengthM,
      bedWidthM,
      deckHeightM,
      hasDovetail,
      dovetailLengthIn,
      dovetailDropIn,
      deckOver
    } = metrics;

    const deckMaterialType = config.deckMaterial === 'diamond_plate' ? 'deck_diamond_plate' : 'deck_wood';
    const deckMat = this.materials.getMaterial(deckMaterialType, {
      repeatX: Math.round(metrics.bedLengthFt / 3),
      repeatY: 4
    });

    const deckThicknessM = 0.048; // ~2" nominal
    const dovetailLengthM = (dovetailLengthIn || 0) * 0.0254;
    const dovetailDropM = (dovetailDropIn || 0) * 0.0254;
    const flatLengthM = bedLengthM - dovetailLengthM;
    const effectiveDeckWidthM = deckOver ? bedWidthM : (bedWidthM - 0.1);

    const boardCount = Math.max(1, Math.round(effectiveDeckWidthM / .145));
    const boardWidth = effectiveDeckWidthM / boardCount;
    const sections = [{ length: flatLengthM, x: flatLengthM / 2, y: deckHeightM + deckThicknessM / 2, angle: 0 }];
    if (hasDovetail) sections.push({
      length: Math.hypot(dovetailLengthM, dovetailDropM),
      x: flatLengthM + dovetailLengthM / 2,
      y: deckHeightM - dovetailDropM / 2 + deckThicknessM / 2,
      angle: -Math.atan2(dovetailDropM, dovetailLengthM)
    });
    for (const section of sections) {
      const wood = config.deckMaterial === 'wood';
      for (let index = 0; index < (wood ? boardCount : 1); index++) {
        const material = wood ? this.materials.getMaterial('deck_wood', {
          repeatX: Math.max(1, Math.round(metrics.bedLengthFt / 8)), repeatY: 1,
          singleBoard: true, tone: index % 5
        }) : deckMat;
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(section.length, deckThicknessM, wood ? boardWidth - .003 : effectiveDeckWidthM), material);
        mesh.position.set(section.x, section.y, wood ? -effectiveDeckWidthM / 2 + boardWidth * (index + .5) : 0);
        mesh.rotation.z = section.angle;
        mesh.castShadow = mesh.receiveShadow = true;
        this.deckGroup.add(mesh);
      }
    }
    // Recessed tie-down rings add useful detail along both deck edges.
    const hardware = this.materials.getMaterial('zinc_hardware');
    for (const fraction of [.14, .45, .76]) {
      for (const side of [-1, 1]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(.045, .009, 6, 18), hardware);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(flatLengthM * fraction, deckHeightM + deckThicknessM + .008, side * (effectiveDeckWidthM / 2 - .10));
        ring.castShadow = true; this.deckGroup.add(ring);
      }
    }
  }

  /**
   * Procedural Hitch: Bumper Pull A-Frame vs Gooseneck Tower.
   * Clean geometric alignment without extraneous or glitched floating bars.
   */
  buildHitch(config, metrics) {
    const {
      bedWidthM,
      deckHeightM,
      couplerHeightIn,
      hitchStyle,
      mainBeamDepthIn
    } = metrics;

    const frameColor = config.finishColor || '#27272a';
    const frameMat = this.materials.getMaterial('frame_steel', { color: frameColor });
    const hardwareMat = this.materials.getMaterial('zinc_hardware');
    const couplerElevationM = couplerHeightIn * 0.0254;
    const beamDepthM = mainBeamDepthIn * 0.0254;
    const railZOffset = metrics.deckOver ? (bedWidthM / 2 - 0.25) : (bedWidthM / 2 - 0.06);

    if (hitchStyle === 'bumper_pull') {
      // ----------------- BUMPER PULL A-FRAME -----------------
      const tongueReachM = 1.45; // ~57 inches forward reach
      const couplerPos = new THREE.Vector3(-tongueReachM, couplerElevationM, 0);

      // Two converging channel beams running from frame rails to coupler
      [-1, 1].forEach(side => {
        const startPos = new THREE.Vector3(0, deckHeightM - beamDepthM / 2, side * railZOffset * 0.85);
        const dir = new THREE.Vector3().subVectors(couplerPos, startPos);
        const length = dir.length();
        const midPos = new THREE.Vector3().addVectors(startPos, couplerPos).multiplyScalar(0.5);

        // Beam geometry aligned along X
        const beamGeo = new THREE.BoxGeometry(length, beamDepthM * 0.75, 0.06);
        const beamMesh = new THREE.Mesh(beamGeo, frameMat);
        beamMesh.position.copy(midPos);

        // Orient mesh along the direction vector
        const unitDir = dir.clone().normalize();
        beamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), unitDir);
        beamMesh.castShadow = true;
        this.hitchGroup.add(beamMesh);
      });

      // Central A-Frame Coupler Head Housing (2-5/16" Ball Coupler)
      const couplerHousingGeo = new THREE.BoxGeometry(0.28, 0.12, 0.20);
      const couplerHousing = new THREE.Mesh(couplerHousingGeo, frameMat);
      couplerHousing.position.set(-tongueReachM + 0.05, couplerElevationM + 0.04, 0);
      couplerHousing.castShadow = true;
      this.hitchGroup.add(couplerHousing);

      // Ball socket casting
      const socketGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.10, 16);
      const socket = new THREE.Mesh(socketGeo, hardwareMat);
      socket.position.set(-tongueReachM - 0.04, couplerElevationM + 0.05, 0);
      socket.castShadow = true;
      this.hitchGroup.add(socket);

      // Locking latch on top
      const latchGeo = new THREE.BoxGeometry(0.10, 0.03, 0.05);
      const latch = new THREE.Mesh(latchGeo, hardwareMat);
      latch.position.set(-tongueReachM - 0.02, couplerElevationM + 0.11, 0);
      this.hitchGroup.add(latch);



    } else {
      // ----------------- GOOSENECK TOWER -----------------
      // Specifically modeled for 2016 Ford F-250 6.5ft bed clearances
      const neckRiseHeightM = 1.62; // ~63.8 inches (clears 55.5" bed rails by 8")
      const neckForwardReachM = 2.34; // ~92 inches forward
      const ballCouplerElevationM = 0.889; // 35 inches ball height in truck bed
      const riserZ = railZOffset * 0.75;
      const neckBeamDepth = 0.20; // 8" heavy beam

      // 1. Dual Angled Risers rising from front frame up & forward
      [-1, 1].forEach(side => {
        const startPos = new THREE.Vector3(0, deckHeightM - beamDepthM / 2, side * riserZ);
        const topPos = new THREE.Vector3(-0.95, neckRiseHeightM, side * riserZ);
        const dir = new THREE.Vector3().subVectors(topPos, startPos);
        const length = dir.length();
        const midPos = new THREE.Vector3().addVectors(startPos, topPos).multiplyScalar(0.5);

        const riserGeo = new THREE.BoxGeometry(length, neckBeamDepth, 0.08);
        const riserMesh = new THREE.Mesh(riserGeo, frameMat);
        riserMesh.position.copy(midPos);
        riserMesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.clone().normalize());
        riserMesh.castShadow = true;
        this.hitchGroup.add(riserMesh);

        // Lower gusset reinforcement at frame junction
        const gussetGeo = new THREE.BoxGeometry(0.32, 0.25, 0.02);
        const gusset = new THREE.Mesh(gussetGeo, frameMat);
        gusset.position.set(-0.20, deckHeightM + 0.12, side * riserZ);
        this.hitchGroup.add(gusset);
      });

      // 2. Horizontal Upper Overhang Beams
      [-1, 1].forEach(side => {
        const overhangLen = neckForwardReachM - 0.95;
        const overGeo = new THREE.BoxGeometry(overhangLen, neckBeamDepth, 0.08);
        const overMesh = new THREE.Mesh(overGeo, frameMat);
        overMesh.position.set(-0.95 - (overhangLen / 2), neckRiseHeightM, side * riserZ);
        overMesh.castShadow = true;
        this.hitchGroup.add(overMesh);
      });

      // Front cross-plate connecting dual overhang beams
      const frontCrossGeo = new THREE.BoxGeometry(0.12, neckBeamDepth, (riserZ * 2) + 0.08);
      const frontCross = new THREE.Mesh(frontCrossGeo, frameMat);
      frontCross.position.set(-neckForwardReachM, neckRiseHeightM, 0);
      frontCross.castShadow = true;
      this.hitchGroup.add(frontCross);

      // 3. Vertical Drop Tube & 2-5/16" Ball Coupler
      const dropTubeX = -neckForwardReachM + 0.20;
      const dropTubeLength = neckRiseHeightM - ballCouplerElevationM;
      const dropTubeGeo = new THREE.CylinderGeometry(0.065, 0.065, dropTubeLength, 20);
      const dropTube = new THREE.Mesh(dropTubeGeo, frameMat);
      dropTube.position.set(dropTubeX, ballCouplerElevationM + (dropTubeLength / 2), 0);
      dropTube.castShadow = true;
      this.hitchGroup.add(dropTube);

      // Adjustable inner sleeve
      const sleeveGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.22, 16);
      const sleeve = new THREE.Mesh(sleeveGeo, hardwareMat);
      sleeve.position.set(dropTubeX, ballCouplerElevationM + 0.08, 0);
      this.hitchGroup.add(sleeve);

      // Round 2-5/16" Gooseneck Coupler Base
      const gnCouplerGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.08, 20);
      const gnCoupler = new THREE.Mesh(gnCouplerGeo, hardwareMat);
      gnCoupler.position.set(dropTubeX, ballCouplerElevationM, 0);
      this.hitchGroup.add(gnCoupler);
    }
  }

  /**
   * Procedural Ramps: Adjustable Slide-in Ramps vs Fold-Flat Heavy Equipment Ramps.
   * Pivot is placed exactly at the trailer rear lip hinge so ramps are perfectly attached,
   * properly oriented, and touch the ground at Y = 0.
   */
  buildRamps(config, metrics) {
    const {
      bedLengthM,
      bedWidthM,
      deckHeightM,
      dovetailDropIn,
      rampAngleDeg,
      rampStyle,
      rampLengthFt
    } = metrics;

    const frameColor = config.finishColor || '#27272a';
    const frameMat = this.materials.getMaterial('frame_steel', { color: frameColor });
    const hardwareMat = this.materials.getMaterial('zinc_hardware');

    this.rampAssemblies = [];
    const rampPos = config.rampPosition || 'deployed'; // 'stowed' | 'deployed' | 'standing'
    const rampWidthM = 0.42; // ~16.5" wide ramp runner
    const rampThickM = 0.065;

    // Rear attachment elevation and location
    const dovetailDropM = (dovetailDropIn || 0) * 0.0254;
    const rearHingeY = deckHeightM - dovetailDropM;
    const rearLipX = bedLengthM;

    // Track offset for left and right ramps
    const rampTrackZ = bedWidthM * 0.32;

    if (rampStyle === 'slide_in') {
      // ----------------- ADJUSTABLE SLIDE-IN RAMPS -----------------
      const rampLengthM = rampLengthFt * 0.3048;

      // 1. Under-bed storage channel rack sleeves (always mounted under rear frame)
      [-1, 1].forEach(side => {
        const rackGeo = new THREE.BoxGeometry(rampLengthM * 0.85, 0.09, rampWidthM + 0.06);
        const rackMesh = new THREE.Mesh(rackGeo, frameMat);
        rackMesh.position.set(rearLipX - (rampLengthM * 0.85 / 2) - 0.1, rearHingeY - 0.12, side * rampTrackZ);
        rackMesh.castShadow = true;
        this.rampGroup.add(rackMesh);
      });

      // 2. Left and Right Ramps
      [-1, 1].forEach(side => {
        // Construct ramp with pivot at (0, 0, 0) extending along +X from 0 to rampLengthM
        const rampAssembly = this.createHingedLadderRamp(rampLengthM, rampWidthM, rampThickM, frameMat, hardwareMat);

        if (rampPos === 'stowed') {
          // Stowed inside the under-bed slide rack
          rampAssembly.rotation.z = 0;
          rampAssembly.position.set(rearLipX - rampLengthM - 0.05, rearHingeY - 0.12, side * rampTrackZ);
        } else {
          // Deployed: attached at trailer rear lip (rearLipX, rearHingeY) and angled down to ground
          const rad = (rampAngleDeg * Math.PI) / 180;
          rampAssembly.position.set(rearLipX, rearHingeY, side * rampTrackZ);
          // Negative rotation around Z declines downward from the trailer to the ground behind it
          rampAssembly.rotation.z = -rad;
        }

        this.rampGroup.add(rampAssembly); this.rampAssemblies.push(rampAssembly);
      });

    } else {
      // ----------------- FOLD-FLAT EQUIPMENT RAMPS -----------------
      const rampLengthM = 1.524; // Standard 5ft (60") heavy duty fold-flat ramp

      [-1, 1].forEach(side => {
        const rampAssembly = this.createHingedFoldFlatRamp(rampLengthM, rampWidthM, rampThickM, frameMat, hardwareMat);
        rampAssembly.position.set(rearLipX, rearHingeY, side * rampTrackZ);

        if (rampPos === 'standing') {
          // Standing vertical (90 degrees) for transport
          rampAssembly.rotation.z = Math.PI / 2;

        } else if (rampPos === 'stowed') {
          // Folded 180 degrees forward flat onto dovetail deck surface
          rampAssembly.rotation.z = Math.PI;

        } else {
          // Deployed down to ground
          const rad = (rampAngleDeg * Math.PI) / 180;
          rampAssembly.rotation.z = -rad;
        }

        this.rampGroup.add(rampAssembly); this.rampAssemblies.push(rampAssembly);
      });
    }
    this.setPose(config.rampDeploymentPct / 100);
  }

  setPose(value) {
    this.pose = value;
    const m = this.currentMetrics;
    const y = m.deckHeightM - m.dovetailDropIn * .0254;
    const angle = THREE.MathUtils.degToRad(m.rampAngleDeg);
    for (const ramp of this.rampAssemblies || []) {
      if (m.rampStyle === "slide_in") {
        const length = m.rampLengthFt * .3048;
        ramp.position.x = THREE.MathUtils.lerp(m.bedLengthM - length - .05, m.bedLengthM, Math.min(1, value / .65));
        ramp.position.y = y - .12 + .12 * THREE.MathUtils.clamp((value - .65) / .15, 0, 1);
        ramp.rotation.z = -angle * THREE.MathUtils.clamp((value - .8) / .2, 0, 1);
      } else {
        ramp.rotation.z = value <= .5 ? THREE.MathUtils.lerp(Math.PI, Math.PI / 2, value * 2) : THREE.MathUtils.lerp(Math.PI / 2, -angle, (value - .5) * 2);
      }
    }
  }

  /**
   * Constructs ladder-style ramp with pivot at (0, 0, 0), extending along +X from 0 to lengthM.
   */
  createHingedLadderRamp(lengthM, widthM, thickM, material, hardwareMat) {
    const group = new THREE.Group();

    // Hinge Pin / Collar at X = 0
    const hingeGeo = new THREE.CylinderGeometry(0.02, 0.02, widthM + 0.04, 16);
    hingeGeo.rotateX(Math.PI / 2);
    const hinge = new THREE.Mesh(hingeGeo, hardwareMat);
    hinge.position.set(0, 0, 0);
    group.add(hinge);

    // Left and Right longitudinal side C-channels (centered along X from 0 to lengthM)
    [-1, 1].forEach(side => {
      const channelGeo = new THREE.BoxGeometry(lengthM, thickM, 0.04);
      const channel = new THREE.Mesh(channelGeo, material);
      channel.position.set(lengthM / 2, -thickM / 2, side * (widthM / 2 - 0.02));
      channel.castShadow = true;
      group.add(channel);
    });

    // Traction Angle Iron Cleats / Rungs along top surface
    const rungSpacing = 0.15;
    for (let x = 0.10; x < lengthM - 0.06; x += rungSpacing) {
      const rungGeo = new THREE.BoxGeometry(0.03, 0.025, widthM - 0.04);
      const rung = new THREE.Mesh(rungGeo, material);
      rung.position.set(x, 0.01, 0);
      rung.castShadow = true;
      group.add(rung);
    }

    // Ground Toe / Taper Plate at X = lengthM
    const toeGeo = new THREE.BoxGeometry(0.12, 0.015, widthM);
    const toe = new THREE.Mesh(toeGeo, material);
    toe.position.set(lengthM - 0.06, -thickM + 0.01, 0);
    group.add(toe);

    return group;
  }

  /**
   * Constructs heavy-duty fold-flat ramp with pivot at (0, 0, 0) and dual torsion spring assist.
   */
  createHingedFoldFlatRamp(lengthM, widthM, thickM, material, hardwareMat) {
    const group = this.createHingedLadderRamp(lengthM, widthM, thickM, material, hardwareMat);

    // Dual Torsion Spring Assist Cylinders at hinge pivot
    [-1, 1].forEach(side => {
      const springGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.08, 16);
      springGeo.rotateX(Math.PI / 2);
      const spring = new THREE.Mesh(springGeo, hardwareMat);
      spring.position.set(0.04, 0, side * (widthM / 2 + 0.03));
      group.add(spring);
    });

    // Fold-Flat Ground Foot / Stabilizer at outer end
    const footGeo = new THREE.BoxGeometry(0.05, 0.14, widthM);
    const foot = new THREE.Mesh(footGeo, material);
    foot.position.set(lengthM - 0.05, -thickM - 0.04, 0);
    group.add(foot);

    return group;
  }
}
