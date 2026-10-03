/**
 * BaseTrailer.js
 * Abstract Base Class for all procedural trailers.
 * Encapsulates scene lifecycle, running gear, suspension kinematics, wheels, fenders, lighting, and memory cleanup.
 */
import * as THREE from 'three';

export class BaseTrailer {
  constructor(scene, materialFactory) {
    if (new.target === BaseTrailer) {
      throw new TypeError('Cannot construct BaseTrailer instances directly. Subclass must extend BaseTrailer.');
    }

    this.scene = scene;
    this.materials = materialFactory;

    // Root Group
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'Trailer_Root';

    // Subsystem Groups
    this.chassisGroup = new THREE.Group();
    this.chassisGroup.name = 'Chassis_Assembly';

    this.runningGearGroup = new THREE.Group();
    this.runningGearGroup.name = 'Running_Gear_Assembly';

    this.deckGroup = new THREE.Group();
    this.deckGroup.name = 'Deck_Assembly';

    this.hitchGroup = new THREE.Group();
    this.hitchGroup.name = 'Hitch_Assembly';

    this.rampGroup = new THREE.Group();
    this.rampGroup.name = 'Ramp_Assembly';

    this.accessoriesGroup = new THREE.Group();
    this.accessoriesGroup.name = 'Accessories_Assembly';

    this.rootGroup.add(this.chassisGroup);
    this.rootGroup.add(this.runningGearGroup);
    this.rootGroup.add(this.deckGroup);
    this.rootGroup.add(this.hitchGroup);
    this.rootGroup.add(this.rampGroup);
    this.rootGroup.add(this.accessoriesGroup);

    this.currentConfig = null;
    this.currentMetrics = null;

    this.scene.add(this.rootGroup);
  }

  /**
   * Main lifecycle method to build the complete trailer.
   */
  build(config, metrics) {
    this.currentConfig = config;
    this.currentMetrics = metrics;

    // Clear previous children
    this.clearGroup(this.chassisGroup);
    this.clearGroup(this.runningGearGroup);
    this.clearGroup(this.deckGroup);
    this.clearGroup(this.hitchGroup);
    this.clearGroup(this.rampGroup);
    this.clearGroup(this.accessoriesGroup);

    // Build subsystems
    this.buildFrame(config, metrics);
    this.buildRunningGear(config, metrics);
    this.buildDeck(config, metrics);
    this.buildHitch(config, metrics);
    this.buildRamps(config, metrics);
    this.buildFenders(config, metrics);
    this.buildLightingAndSafety(config, metrics);
  }

  /**
   * Abstract methods to be overridden by subclasses.
   */
  buildFrame(config, metrics) {
    throw new Error('Method "buildFrame" must be implemented by subclass.');
  }

  buildDeck(config, metrics) {
    throw new Error('Method "buildDeck" must be implemented by subclass.');
  }

  buildHitch(config, metrics) {
    throw new Error('Method "buildHitch" must be implemented by subclass.');
  }

  buildRamps(config, metrics) {
    throw new Error('Method "buildRamps" must be implemented by subclass.');
  }

  /**
   * Builds the running gear: axles, leaf springs, equalizers, hubs, rims, and tires.
   */
  buildRunningGear(config, metrics) {
    const {
      axlePositionsM,
      deckHeightM,
      tireRadiusM,
      deckOver,
      payloadClass,
      bedWidthM
    } = metrics;

    const tireMaterial = this.materials.getMaterial('tire_rubber');
    const rimMaterial = this.materials.getMaterial('wheel_rim');
    const hardwareMaterial = this.materials.getMaterial('zinc_hardware');
    const axleMaterial = this.materials.getMaterial('black_iron');

    const axleRadiusM = 0.045; // 3.5" round axle tube
    const trackWidthM = deckOver ? (bedWidthM - 0.25) : (bedWidthM + 0.35);
    const axleElevationY = tireRadiusM;

    axlePositionsM.forEach((axleXM, index) => {
      const axleSubGroup = new THREE.Group();
      axleSubGroup.name = `Axle_${index + 1}`;

      // 1. Axle Tube
      const axleLength = trackWidthM;
      const axleGeo = new THREE.CylinderGeometry(axleRadiusM, axleRadiusM, axleLength, 16);
      axleGeo.rotateX(Math.PI / 2);
      const axleMesh = new THREE.Mesh(axleGeo, axleMaterial);
      axleMesh.position.set(axleXM, axleElevationY, 0);
      axleMesh.castShadow = true;
      axleSubGroup.add(axleMesh);

      // 2. Leaf Springs
      [-1, 1].forEach(side => {
        const springZ = side * (trackWidthM / 2 - 0.12);
        const springGroup = this.createLeafSpringAssembly(axleXM, axleElevationY, springZ, deckHeightM);
        axleSubGroup.add(springGroup);

        // 3. Wheel Assemblies
        const isDual = (payloadClass === '20K' || payloadClass === '25K');
        if (isDual) {
          const wheelInner = this.createWheelAssembly(tireRadiusM, rimMaterial, tireMaterial, hardwareMaterial);
          wheelInner.position.set(axleXM, axleElevationY, springZ + side * 0.14);
          axleSubGroup.add(wheelInner);

          const wheelOuter = this.createWheelAssembly(tireRadiusM, rimMaterial, tireMaterial, hardwareMaterial);
          wheelOuter.position.set(axleXM, axleElevationY, springZ + side * 0.36);
          axleSubGroup.add(wheelOuter);
        } else {
          const wheel = this.createWheelAssembly(tireRadiusM, rimMaterial, tireMaterial, hardwareMaterial);
          wheel.position.set(axleXM, axleElevationY, springZ + side * 0.18);
          axleSubGroup.add(wheel);
        }
      });

      this.runningGearGroup.add(axleSubGroup);
    });

    if (axlePositionsM.length >= 2) {
      this.buildEqualizers(axlePositionsM, axleElevationY, trackWidthM);
    }
  }

  /**
   * Procedural Fenders: Regular Teardrop vs Heavy Drive-Over.
   * If deck_over, no fenders are added (deck is full width above tires).
   */
  buildFenders(config, metrics) {
    const fenderStyle = config.fenderStyle || metrics.fenderStyle || 'regular';
    if (fenderStyle === 'deck_over' || metrics.deckOver) {
      return; // No fenders on deck-over style (full width deck over wheels)
    }

    const {
      axlePositionsM,
      axleCentroidFromFrontM,
      deckHeightM,
      bedWidthM,
      tireRadiusM = 0.39
    } = metrics;

    const frameMat = this.materials.getMaterial('frame_steel', { color: config.finishColor || '#27272a' });
    const diamondMat = this.materials.getMaterial('deck_diamond_plate');
    const chromeMat = this.materials.getMaterial('zinc_hardware');

    // 1. Calculate longitudinal span and heights
    const minAxleX = (axlePositionsM && axlePositionsM.length > 0) ? Math.min(...axlePositionsM) : (axleCentroidFromFrontM - 0.45);
    const maxAxleX = (axlePositionsM && axlePositionsM.length > 0) ? Math.max(...axlePositionsM) : (axleCentroidFromFrontM + 0.45);

    const tireTopY = tireRadiusM * 2; // top of tire above ground
    const fenderTopY = Math.max(deckHeightM + 0.16, tireTopY + 0.06); // sits over tires
    const fenderBottomY = 0.20; // drops down to 8" above ground (below axle center at ~0.39m)
    const fenderTotalHeight = fenderTopY - fenderBottomY;

    // Longitudinal span with front and rear coverage
    const xStart = minAxleX - tireRadiusM - 0.14;
    const xEnd = maxAxleX + tireRadiusM + 0.14;
    const totalSpanX = xEnd - xStart;
    const centerX = (xStart + xEnd) / 2;

    // Transverse (Z) placement:
    // Inner edge starts at bedWidthM / 2 (tight against trailer side rail)
    // Extends outward past tire outer edge
    const fenderWidthM = 0.36; // 14.2 inches wide
    const halfBedWidth = bedWidthM / 2;

    [-1, 1].forEach(side => {
      const fenderGroup = new THREE.Group();
      fenderGroup.name = `Fender_${side < 0 ? 'Left' : 'Right'}`;

      const zInner = side * halfBedWidth;
      const zOuter = side * (halfBedWidth + fenderWidthM);
      const zCenter = (zInner + zOuter) / 2;

      if (fenderStyle === 'drive_over') {
        // ============================================================
        // HEAVY-DUTY DIAMOND PLATE DRIVE-OVER FENDERS (OPEN WHEEL DESIGN)
        // ============================================================
        const topFlatLen = (maxAxleX - minAxleX) + (tireRadiusM * 1.3);
        const rampLen = (totalSpanX - topFlatLen) / 2;
        const rampAngle = Math.atan2(fenderTopY - (fenderBottomY + 0.08), rampLen);
        const frontRampHyp = Math.sqrt(rampLen * rampLen + Math.pow(fenderTopY - (fenderBottomY + 0.08), 2));

        // 1. Top Flat Diamond Plate (drivable surface over wheels)
        const topGeo = new THREE.BoxGeometry(topFlatLen, 0.045, fenderWidthM);
        const topMesh = new THREE.Mesh(topGeo, diamondMat);
        topMesh.position.set(centerX, fenderTopY, zCenter);
        topMesh.castShadow = true;
        fenderGroup.add(topMesh);

        // 2. Front 35° Approach Ramp
        const frontRampGeo = new THREE.BoxGeometry(frontRampHyp, 0.04, fenderWidthM);
        const frontRamp = new THREE.Mesh(frontRampGeo, diamondMat);
        frontRamp.rotation.z = rampAngle;
        frontRamp.position.set(
          centerX - (topFlatLen / 2) - (rampLen / 2),
          (fenderTopY + fenderBottomY + 0.08) / 2,
          zCenter
        );
        frontRamp.castShadow = true;
        fenderGroup.add(frontRamp);

        // 3. Rear 35° Approach Ramp
        const rearRampGeo = new THREE.BoxGeometry(frontRampHyp, 0.04, fenderWidthM);
        const rearRamp = new THREE.Mesh(rearRampGeo, diamondMat);
        rearRamp.rotation.z = -rampAngle;
        rearRamp.position.set(
          centerX + (topFlatLen / 2) + (rampLen / 2),
          (fenderTopY + fenderBottomY + 0.08) / 2,
          zCenter
        );
        rearRamp.castShadow = true;
        fenderGroup.add(rearRamp);

        // 4. Outer Structural Rim (2" steel angle lip along outer perimeter - wheels remain open & visible!)
        const rimHeight = 0.055; // 2.2 inches tall outer lip
        const topRimGeo = new THREE.BoxGeometry(topFlatLen, rimHeight, 0.018);
        const topRim = new THREE.Mesh(topRimGeo, frameMat);
        topRim.position.set(centerX, fenderTopY - (rimHeight / 2) + 0.01, zOuter - (side * 0.009));
        topRim.castShadow = true;
        fenderGroup.add(topRim);

        const frontRimGeo = new THREE.BoxGeometry(frontRampHyp, rimHeight, 0.018);
        const frontRim = new THREE.Mesh(frontRimGeo, frameMat);
        frontRim.rotation.z = rampAngle;
        frontRim.position.set(
          centerX - (topFlatLen / 2) - (rampLen / 2),
          (fenderTopY + fenderBottomY + 0.08) / 2 - (rimHeight / 4),
          zOuter - (side * 0.009)
        );
        frontRim.castShadow = true;
        fenderGroup.add(frontRim);

        const rearRimGeo = new THREE.BoxGeometry(frontRampHyp, rimHeight, 0.018);
        const rearRim = new THREE.Mesh(rearRimGeo, frameMat);
        rearRim.rotation.z = -rampAngle;
        rearRim.position.set(
          centerX + (topFlatLen / 2) + (rampLen / 2),
          (fenderTopY + fenderBottomY + 0.08) / 2 - (rimHeight / 4),
          zOuter - (side * 0.009)
        );
        rearRim.castShadow = true;
        fenderGroup.add(rearRim);

        // 5. Heavy-Duty Underbody Chassis Mounting Outriggers (tucked beneath fender, out of wheel path)
        [xStart + 0.15, centerX, xEnd - 0.15].forEach(ox => {
          const outriggerGeo = new THREE.BoxGeometry(0.08, 0.06, fenderWidthM);
          const outrigger = new THREE.Mesh(outriggerGeo, frameMat);
          outrigger.position.set(ox, deckHeightM - 0.04, zCenter);
          outrigger.castShadow = true;
          fenderGroup.add(outrigger);
        });

      } else {
        // ============================================================
        // REGULAR TEARDROP CURVED STEEL FENDERS (OPEN WHEEL ARCH)
        // ============================================================
        const topFlatLen = (maxAxleX - minAxleX) + 0.35;
        const apronLen = (totalSpanX - topFlatLen) / 2;
        const apronAngle = Math.atan2(fenderTopY - (fenderBottomY + 0.08), apronLen);
        const apronHyp = Math.sqrt(apronLen * apronLen + Math.pow(fenderTopY - (fenderBottomY + 0.08), 2));

        // 1. Top Canopy Plate (shields tire tread from above)
        const topCanopyGeo = new THREE.BoxGeometry(topFlatLen, 0.025, fenderWidthM);
        const topCanopy = new THREE.Mesh(topCanopyGeo, frameMat);
        topCanopy.position.set(centerX, fenderTopY, zCenter);
        topCanopy.castShadow = true;
        fenderGroup.add(topCanopy);

        // 2. Front Sloped Apron (drops down to front step pad)
        const frontApronGeo = new THREE.BoxGeometry(apronHyp, 0.022, fenderWidthM);
        const frontApron = new THREE.Mesh(frontApronGeo, frameMat);
        frontApron.rotation.z = apronAngle;
        frontApron.position.set(
          centerX - (topFlatLen / 2) - (apronLen / 2),
          (fenderTopY + fenderBottomY + 0.08) / 2,
          zCenter
        );
        frontApron.castShadow = true;
        fenderGroup.add(frontApron);

        // 3. Rear Sloped Apron (drops down to rear step pad)
        const rearApronGeo = new THREE.BoxGeometry(apronHyp, 0.022, fenderWidthM);
        const rearApron = new THREE.Mesh(rearApronGeo, frameMat);
        rearApron.rotation.z = -apronAngle;
        rearApron.position.set(
          centerX + (topFlatLen / 2) + (apronLen / 2),
          (fenderTopY + fenderBottomY + 0.08) / 2,
          zCenter
        );
        rearApron.castShadow = true;
        fenderGroup.add(rearApron);

        // 4. Outer Rolled Perimeter Lip (1.5" formed flange - wheels are 100% open & visible!)
        const lipHeight = 0.042; // 1.6 inches outer lip
        const topLipGeo = new THREE.BoxGeometry(topFlatLen, lipHeight, 0.014);
        const topLip = new THREE.Mesh(topLipGeo, frameMat);
        topLip.position.set(centerX, fenderTopY - (lipHeight / 2) + 0.008, zOuter - (side * 0.007));
        topLip.castShadow = true;
        fenderGroup.add(topLip);

        const frontLipGeo = new THREE.BoxGeometry(apronHyp, lipHeight, 0.014);
        const frontLip = new THREE.Mesh(frontLipGeo, frameMat);
        frontLip.rotation.z = apronAngle;
        frontLip.position.set(
          centerX - (topFlatLen / 2) - (apronLen / 2),
          (fenderTopY + fenderBottomY + 0.08) / 2 - (lipHeight / 4),
          zOuter - (side * 0.007)
        );
        frontLip.castShadow = true;
        fenderGroup.add(frontLip);

        const rearLipGeo = new THREE.BoxGeometry(apronHyp, lipHeight, 0.014);
        const rearLip = new THREE.Mesh(rearLipGeo, frameMat);
        rearLip.rotation.z = -apronAngle;
        rearLip.position.set(
          centerX + (topFlatLen / 2) + (apronLen / 2),
          (fenderTopY + fenderBottomY + 0.08) / 2 - (lipHeight / 4),
          zOuter - (side * 0.007)
        );
        rearLip.castShadow = true;
        fenderGroup.add(rearLip);

        // 5. Classic Teardrop Center Drop Point (small inverted triangle between tandem wheels)
        if (axlePositionsM && axlePositionsM.length >= 2) {
          const teardropPointGeo = new THREE.ConeGeometry(0.065, 0.085, 3);
          teardropPointGeo.rotateZ(Math.PI); // inverted point pointing down in V-notch
          const teardropPoint = new THREE.Mesh(teardropPointGeo, frameMat);
          teardropPoint.position.set(centerX, fenderTopY - lipHeight - 0.025, zOuter - (side * 0.007));
          teardropPoint.castShadow = true;
          fenderGroup.add(teardropPoint);
        }

        // 6. Chrome / Satin Rolled Accent Trim along top edge
        const beadGeo = new THREE.CylinderGeometry(0.009, 0.009, topFlatLen + 0.05, 12);
        beadGeo.rotateZ(Math.PI / 2);
        const bead = new THREE.Mesh(beadGeo, chromeMat);
        bead.position.set(centerX, fenderTopY + 0.005, zOuter - (side * 0.004));
        fenderGroup.add(bead);

        // 7. Upper Inner Splash Seal (flush against frame rail above deck level)
        const innerSealGeo = new THREE.BoxGeometry(topFlatLen, 0.12, 0.012);
        const innerSeal = new THREE.Mesh(innerSealGeo, frameMat);
        innerSeal.position.set(centerX, fenderTopY - 0.05, zInner + (side * 0.006));
        innerSeal.castShadow = true;
        fenderGroup.add(innerSeal);

        // 8. Front & Rear Diamond-Plate Step Pads (at base of fender)
        [-1, 1].forEach(endSide => {
          const stepX = centerX + (endSide * (totalSpanX / 2 + 0.08));
          const stepGeo = new THREE.BoxGeometry(0.22, 0.03, fenderWidthM);
          const step = new THREE.Mesh(stepGeo, diamondMat);
          step.position.set(stepX, fenderBottomY + 0.08, zCenter);
          step.castShadow = true;
          fenderGroup.add(step);

          // Gusset brace connecting step pad directly to main frame rail
          const braceGeo = new THREE.BoxGeometry(0.04, 0.08, fenderWidthM * 0.7);
          const brace = new THREE.Mesh(braceGeo, frameMat);
          brace.position.set(stepX, fenderBottomY + 0.025, zInner + side * (fenderWidthM * 0.35));
          fenderGroup.add(brace);
        });
      }

      this.runningGearGroup.add(fenderGroup);
    });
  }

  createLeafSpringAssembly(axleX, axleY, springZ, deckHeightM) {
    const group = new THREE.Group();
    const ironMat = this.materials.getMaterial('black_iron');
    const zincMat = this.materials.getMaterial('zinc_hardware');

    const springLength = 0.68;
    const springThickness = 0.035;
    const springWidth = 0.05;

    const leafGeo = new THREE.BoxGeometry(springLength, springThickness, springWidth);
    const leafMesh = new THREE.Mesh(leafGeo, ironMat);
    leafMesh.position.set(axleX, axleY + 0.04, springZ);
    leafMesh.castShadow = true;
    group.add(leafMesh);

    const helperGeo = new THREE.BoxGeometry(springLength * 0.7, springThickness * 0.8, springWidth);
    const helperMesh = new THREE.Mesh(helperGeo, ironMat);
    helperMesh.position.set(axleX, axleY + 0.07, springZ);
    group.add(helperMesh);

    const uBoltGeo = new THREE.BoxGeometry(0.09, 0.09, springWidth + 0.02);
    const uBoltMesh = new THREE.Mesh(uBoltGeo, zincMat);
    uBoltMesh.position.set(axleX, axleY + 0.05, springZ);
    group.add(uBoltMesh);

    return group;
  }

  buildEqualizers(axlePositionsM, axleY, trackWidthM) {
    const zincMat = this.materials.getMaterial('zinc_hardware');
    for (let i = 0; i < axlePositionsM.length - 1; i++) {
      const midX = (axlePositionsM[i] + axlePositionsM[i + 1]) / 2;
      [-1, 1].forEach(side => {
        const z = side * (trackWidthM / 2 - 0.12);
        const eqGeo = new THREE.BoxGeometry(0.18, 0.10, 0.03);
        const eqMesh = new THREE.Mesh(eqGeo, zincMat);
        eqMesh.position.set(midX, axleY + 0.07, z);
        eqMesh.castShadow = true;
        this.runningGearGroup.add(eqMesh);
      });
    }
  }

  createWheelAssembly(tireRadiusM, rimMat, tireMat, hardwareMat) {
    const group = new THREE.Group();
    const tireWidthM = 0.18;
    const rimRadiusM = tireRadiusM * 0.55;

    const tireGeo = new THREE.CylinderGeometry(tireRadiusM, tireRadiusM, tireWidthM, 24);
    tireGeo.rotateX(Math.PI / 2);
    const tireMesh = new THREE.Mesh(tireGeo, tireMat);
    tireMesh.castShadow = true;
    group.add(tireMesh);

    const rimGeo = new THREE.CylinderGeometry(rimRadiusM, rimRadiusM, tireWidthM + 0.005, 24);
    rimGeo.rotateX(Math.PI / 2);
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.castShadow = true;
    group.add(rimMesh);

    const hubCapGeo = new THREE.CylinderGeometry(0.045, 0.045, tireWidthM + 0.02, 16);
    hubCapGeo.rotateX(Math.PI / 2);
    const hubCapMesh = new THREE.Mesh(hubCapGeo, hardwareMat);
    group.add(hubCapMesh);

    const lugCount = 6;
    const lugCircleR = 0.065;
    for (let l = 0; l < lugCount; l++) {
      const angle = (l / lugCount) * Math.PI * 2;
      const lugGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.015, 8);
      lugGeo.rotateX(Math.PI / 2);
      const lugMesh = new THREE.Mesh(lugGeo, hardwareMat);
      lugMesh.position.set(Math.cos(angle) * lugCircleR, Math.sin(angle) * lugCircleR, (tireWidthM / 2) + 0.008);
      group.add(lugMesh);
    }

    return group;
  }

  buildLightingAndSafety(config, metrics) {
    const { bedLengthM, bedWidthM, deckHeightM } = metrics;
    const tailLightMat = this.materials.getMaterial('light_tail_red');
    const amberMarkerMat = this.materials.getMaterial('light_marker_amber');

    [-1, 1].forEach(side => {
      const lightGeo = new THREE.BoxGeometry(0.04, 0.06, 0.14);
      const lightMesh = new THREE.Mesh(lightGeo, tailLightMat);
      lightMesh.position.set(bedLengthM + 0.02, deckHeightM - 0.05, side * (bedWidthM / 2 - 0.15));
      this.accessoriesGroup.add(lightMesh);
    });

    [-1, 1].forEach(side => {
      const amberGeo = new THREE.BoxGeometry(0.03, 0.03, 0.06);
      const amberMesh = new THREE.Mesh(amberGeo, amberMarkerMat);
      amberMesh.position.set(0.02, deckHeightM - 0.04, side * (bedWidthM / 2 + 0.02));
      this.accessoriesGroup.add(amberMesh);
    });
  }

  clearGroup(group) {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.children && child.children.length > 0) {
        this.clearGroup(child);
      }
    }
  }

  dispose() {
    this.clearGroup(this.chassisGroup);
    this.clearGroup(this.runningGearGroup);
    this.clearGroup(this.deckGroup);
    this.clearGroup(this.hitchGroup);
    this.clearGroup(this.rampGroup);
    this.clearGroup(this.accessoriesGroup);
    this.scene.remove(this.rootGroup);
  }
}
