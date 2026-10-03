/**
 * DumpTrailer.js
 * High-fidelity procedural heavy-duty hydraulic dump trailer.
 * Features realistic lower subframe, A-frame & Gooseneck hitches with hydraulic pump box,
 * non-piercing scissor hoist, raised/lowered dumping positions, barn doors vs spreader gate,
 * and custom side wall decals.
 */
import * as THREE from 'three';
import { BaseTrailer } from './BaseTrailer.js';
import { decalFactory } from '../scene/DecalFactory.js';

export class DumpTrailer extends BaseTrailer {
  constructor(scene, materialFactory) {
    super(scene, materialFactory);
  }

  /**
   * Builds the lower chassis subframe and underbody crossmembers.
   */
  buildFrame(config, metrics) {
    const { bedLengthM, bedWidthM, deckHeightM, mainBeamDepthIn } = metrics;
    const frameColor = config.finishColor || '#27272a';
    const frameMat = this.materials.getMaterial('frame_steel', { color: frameColor });

    const beamDepthM = Math.max(0.15, (mainBeamDepthIn || 6.0) * 0.0254);
    const railZ = bedWidthM * 0.38;

    // 1. Lower Subframe Rails (Left & Right)
    [-1, 1].forEach(side => {
      const subRailGeo = new THREE.BoxGeometry(bedLengthM, beamDepthM, 0.08);
      const subRail = new THREE.Mesh(subRailGeo, frameMat);
      subRail.position.set(bedLengthM / 2, deckHeightM - (beamDepthM / 2) - 0.05, side * railZ);
      subRail.castShadow = true;
      this.chassisGroup.add(subRail);
    });

    // 2. Chassis Lower Crossmembers
    for (let x = 0.5; x < bedLengthM - 0.4; x += 0.8) {
      const crossGeo = new THREE.BoxGeometry(0.08, beamDepthM * 0.7, railZ * 2);
      const cross = new THREE.Mesh(crossGeo, frameMat);
      cross.position.set(x, deckHeightM - (beamDepthM / 2) - 0.05, 0);
      cross.castShadow = true;
      this.chassisGroup.add(cross);
    }

    // 3. Rear Dump Hinge Pivot Mounts
    [-1, 1].forEach(side => {
      const pivotPlateGeo = new THREE.BoxGeometry(0.12, 0.16, 0.08);
      const pivotPlate = new THREE.Mesh(pivotPlateGeo, frameMat);
      pivotPlate.position.set(bedLengthM - 0.06, deckHeightM - 0.06, side * railZ);
      pivotPlate.castShadow = true;
      this.chassisGroup.add(pivotPlate);
    });
  }

  /**
   * Builds the tilting dump bed box (floor, 24" walls, doors, hydraulic scissor hoist).
   */
  buildDeck(config, metrics) {
    const { bedLengthM, bedWidthM, deckHeightM } = metrics;
    const frameColor = config.finishColor || '#27272a';
    const frameMat = this.materials.getMaterial('frame_steel', { color: frameColor });
    const steelFloorMat = this.materials.getMaterial('deck_diamond_plate');
    const chromeMat = this.materials.getMaterial('zinc_hardware');

    const wallHeightM = 0.61; // 24" solid steel side walls
    const floorThickM = 0.04;
    const rearHingeX = bedLengthM;
    const rearHingeY = deckHeightM - 0.04;

    // Check if bed is raised or lowered
    const isRaised = config.dumpBedPosition === 'raised';
    const dumpAngleRad = isRaised ? (42 * Math.PI / 180) : 0;

    // Create a tilting bed group hinged at rear
    const dumpBedGroup = new THREE.Group();
    dumpBedGroup.name = 'Dump_Bed_Tilting_Assembly';
    dumpBedGroup.position.set(rearHingeX, rearHingeY, 0);
    // Negative Z rotation elevates the front of the bed upwards into the air at 42 degrees
    dumpBedGroup.rotation.z = -dumpAngleRad;

    // Subframe under dump bed (relative to rear hinge pivot at local (0, 0, 0))
    // Dump bed extends from local X = -bedLengthM to X = 0
    [-1, 1].forEach(side => {
      const underRailGeo = new THREE.BoxGeometry(bedLengthM, 0.08, 0.08);
      const underRail = new THREE.Mesh(underRailGeo, frameMat);
      underRail.position.set(-bedLengthM / 2, 0.04, side * (bedWidthM * 0.38));
      underRail.castShadow = true;
      dumpBedGroup.add(underRail);
    });

    // 1. Heavy 10-Gauge Steel Floor
    const floorGeo = new THREE.BoxGeometry(bedLengthM, floorThickM, bedWidthM);
    const floor = new THREE.Mesh(floorGeo, steelFloorMat);
    floor.position.set(-bedLengthM / 2, 0.08 + (floorThickM / 2), 0);
    floor.castShadow = true;
    floor.receiveShadow = true;
    dumpBedGroup.add(floor);

    // 2. Solid Steel Side Walls (Left & Right) with top tube & stake pockets
    [-1, 1].forEach(side => {
      const wallZ = side * (bedWidthM / 2 - 0.03);

      // Main wall sheet
      const wallGeo = new THREE.BoxGeometry(bedLengthM, wallHeightM, 0.04);
      const wall = new THREE.Mesh(wallGeo, frameMat);
      wall.position.set(-bedLengthM / 2, 0.08 + floorThickM + (wallHeightM / 2), wallZ);
      wall.castShadow = true;
      dumpBedGroup.add(wall);

      // Top square tubing rub rail cap
      const capGeo = new THREE.BoxGeometry(bedLengthM, 0.06, 0.06);
      const cap = new THREE.Mesh(capGeo, frameMat);
      cap.position.set(-bedLengthM / 2, 0.08 + floorThickM + wallHeightM + 0.03, wallZ);
      dumpBedGroup.add(cap);

      // External vertical wall ribs every 3ft
      for (let rx = -bedLengthM + 0.6; rx < -0.3; rx += 0.9) {
        const ribGeo = new THREE.BoxGeometry(0.06, wallHeightM, 0.03);
        const rib = new THREE.Mesh(ribGeo, frameMat);
        rib.position.set(rx, 0.08 + floorThickM + (wallHeightM / 2), wallZ + (side * 0.035));
        dumpBedGroup.add(rib);
      }

      // Custom Frame / Wall Decal Text
      if (config.decalText && config.decalText.trim().length > 0) {
        const decalMesh = decalFactory.createDecalMesh(config.decalText, config.decalColor || '#f59e0b', 1.6, 0.28);
        if (side < 0) decalMesh.rotateY(Math.PI);
        decalMesh.position.set(-bedLengthM / 2, 0.08 + floorThickM + (wallHeightM / 2), wallZ + (side * 0.026));
        dumpBedGroup.add(decalMesh);
      }
    });

    // 3. Front Bulkhead Wall & Tarp Housing
    const frontWallZ = 0;
    const frontWallGeo = new THREE.BoxGeometry(0.04, wallHeightM + 0.12, bedWidthM);
    const frontWall = new THREE.Mesh(frontWallGeo, frameMat);
    frontWall.position.set(-bedLengthM + 0.02, 0.08 + floorThickM + ((wallHeightM + 0.12) / 2), frontWallZ);
    frontWall.castShadow = true;
    dumpBedGroup.add(frontWall);

    // Tarp roller canister on top front
    const tarpGeo = new THREE.CylinderGeometry(0.06, 0.06, bedWidthM - 0.05, 16);
    tarpGeo.rotateX(Math.PI / 2);
    const tarp = new THREE.Mesh(tarpGeo, frameMat);
    tarp.position.set(-bedLengthM + 0.02, 0.08 + floorThickM + wallHeightM + 0.15, 0);
    dumpBedGroup.add(tarp);

    // 4. Rear Gate: Barn Doors vs 2-Way Spreader Tailgate (Item 8)
    this.buildDumpRearGate(dumpBedGroup, bedWidthM, wallHeightM, floorThickM, config.dumpDoorStyle, frameMat, chromeMat);

    this.deckGroup.add(dumpBedGroup);
    this.dumpBed = dumpBedGroup;

    // 5. Non-Piercing Hydraulic Scissor Hoist / Telescopic Ram (Items 6 & 7)
    this.buildHydraulicHoist(bedLengthM, deckHeightM, isRaised, dumpAngleRad, frameMat, chromeMat);
  }

  /**
   * Rear Gate Construction: Double Barn Doors vs 2-Way Spreader Gate.
   */
  buildDumpRearGate(parentGroup, bedWidthM, wallHeightM, floorThickM, gateStyle, frameMat, chromeMat) {
    const gateElevationY = 0.08 + floorThickM + (wallHeightM / 2);

    if (gateStyle === 'spreader') {
      // 2-Way Gravel Spreader & Drop Tailgate
      const gateGeo = new THREE.BoxGeometry(0.05, wallHeightM, bedWidthM - 0.06);
      const gate = new THREE.Mesh(gateGeo, frameMat);
      gate.position.set(-0.02, gateElevationY, 0);
      gate.castShadow = true;
      parentGroup.add(gate);

      // Top spreader hinge pins
      [-1, 1].forEach(side => {
        const pinGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.08, 12);
        pinGeo.rotateX(Math.PI / 2);
        const pin = new THREE.Mesh(pinGeo, chromeMat);
        pin.position.set(-0.02, gateElevationY + (wallHeightM / 2), side * (bedWidthM / 2 - 0.05));
        parentGroup.add(pin);

        // Heavy spreader chains
        const chainGeo = new THREE.CylinderGeometry(0.012, 0.012, wallHeightM * 0.85, 8);
        const chain = new THREE.Mesh(chainGeo, chromeMat);
        chain.position.set(-0.15, gateElevationY, side * (bedWidthM / 2 - 0.05));
        parentGroup.add(chain);
      });

    } else {
      // Split Double Barn Doors with Cam Lock Bars
      const doorWidthM = (bedWidthM - 0.08) / 2;

      [-1, 1].forEach(side => {
        const doorGeo = new THREE.BoxGeometry(0.04, wallHeightM, doorWidthM - 0.01);
        const door = new THREE.Mesh(doorGeo, frameMat);
        door.position.set(-0.02, gateElevationY, side * (doorWidthM / 2 + 0.01));
        door.castShadow = true;
        parentGroup.add(door);

        // Outer Strap Hinges (top and bottom)
        [-wallHeightM * 0.35, wallHeightM * 0.35].forEach(hy => {
          const hingeGeo = new THREE.BoxGeometry(0.08, 0.05, 0.06);
          const hinge = new THREE.Mesh(hingeGeo, chromeMat);
          hinge.position.set(-0.02, gateElevationY + hy, side * (bedWidthM / 2 - 0.03));
          parentGroup.add(hinge);
        });

        // Vertical Cam Locking Rod
        const rodGeo = new THREE.CylinderGeometry(0.014, 0.014, wallHeightM + 0.06, 12);
        const rod = new THREE.Mesh(rodGeo, chromeMat);
        rod.position.set(0.02, gateElevationY, side * (doorWidthM * 0.85));
        parentGroup.add(rod);

        // Lock handle
        const handleGeo = new THREE.BoxGeometry(0.04, 0.03, 0.18);
        const handle = new THREE.Mesh(handleGeo, chromeMat);
        handle.position.set(0.04, gateElevationY - 0.05, side * (doorWidthM * 0.85));
        parentGroup.add(handle);
      });
    }
  }

  /**
   * Hydraulic Scissor Hoist: Located strictly beneath bed floor.
   * Extends dynamically when raised, fits neatly between chassis rails when lowered.
   */
  buildHydraulicHoist(bedLengthM, deckHeightM, isRaised, _angle, frameMat, chromeMat) {
    const group = new THREE.Group();
    group.name = 'Hydraulic_Hoist';
    this.hoistBase = new THREE.Vector3(bedLengthM * .38, deckHeightM - .22, 0);
    this.hoistLength = bedLengthM;
    this.hoistDeckHeight = deckHeightM;
    this.barrel = new THREE.Mesh(new THREE.CylinderGeometry(.065, .065, 1, 20), frameMat);
    this.shaft = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, 1, 20), chromeMat);
    this.barrel.castShadow = this.shaft.castShadow = true;
    group.add(this.barrel, this.shaft);
    this.hoistArms = [-.18, .18].map(z => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(.045, 1, .035), frameMat);
      arm.userData.z = z; arm.castShadow = true; group.add(arm); return arm;
    });
    const pinGeometry = new THREE.CylinderGeometry(.035, .035, .46, 16);
    pinGeometry.rotateX(Math.PI / 2);
    const basePin = new THREE.Mesh(pinGeometry, chromeMat);
    basePin.position.copy(this.hoistBase);
    this.upperPin = new THREE.Mesh(pinGeometry, chromeMat);
    group.add(basePin, this.upperPin);
    this.chassisGroup.add(group);
    this.setPose(config.dumpAngleDeg / 42);
  }

  setPose(value) {
    this.pose = value;
    const angle = value * THREE.MathUtils.degToRad(42);
    this.dumpBed.rotation.z = -angle;
    const mount = new THREE.Vector3(this.hoistLength - this.hoistLength * .55 * Math.cos(angle),
      this.hoistDeckHeight - .04 + this.hoistLength * .55 * Math.sin(angle), 0);
    const direction = mount.clone().sub(this.hoistBase);
    const length = direction.length(); direction.normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    const barrelLength = Math.min(.8, length * .6);
    this.barrel.scale.y = barrelLength;
    this.barrel.quaternion.copy(quaternion);
    this.barrel.position.copy(this.hoistBase).addScaledVector(direction, barrelLength / 2);
    const shaftLength = length - barrelLength + .1;
    this.shaft.scale.y = shaftLength;
    this.shaft.quaternion.copy(quaternion);
    this.shaft.position.copy(mount).addScaledVector(direction, -shaftLength / 2);
    this.upperPin.position.copy(mount);
    for (const arm of this.hoistArms) {
      arm.scale.y = length * .86; arm.quaternion.copy(quaternion);
      arm.position.copy(this.hoistBase).addScaledVector(direction, length * .43);
      arm.position.z = arm.userData.z;
    }
  }

  /**
   * Hitch Assembly: Full A-Frame or Gooseneck with Hydraulic Pump & Battery Box.
   * Completely eliminates disappearing hitch issue.
   */
  buildHitch(config, metrics) {
    const { bedWidthM, deckHeightM, couplerHeightIn, hitchStyle } = metrics;
    const frameColor = config.finishColor || '#27272a';
    const frameMat = this.materials.getMaterial('frame_steel', { color: frameColor });
    const hardwareMat = this.materials.getMaterial('zinc_hardware');
    const blackIronMat = this.materials.getMaterial('black_iron');

    const couplerElevationM = (couplerHeightIn || 19) * 0.0254;
    const railZ = bedWidthM * 0.38;

    if (hitchStyle === 'gooseneck') {
      // ----------------- GOOSENECK TOWER FOR DUMP -----------------
      const neckRiseHeightM = 1.62;
      const neckForwardReachM = 2.34;
      const ballCouplerElevationM = 0.889;
      const neckBeamDepth = 0.20;

      // Dual Angled Risers
      [-1, 1].forEach(side => {
        const startPos = new THREE.Vector3(0, deckHeightM - 0.1, side * railZ);
        const topPos = new THREE.Vector3(-0.95, neckRiseHeightM, side * railZ);
        const dir = new THREE.Vector3().subVectors(topPos, startPos);
        const midPos = new THREE.Vector3().addVectors(startPos, topPos).multiplyScalar(0.5);

        const riserGeo = new THREE.BoxGeometry(dir.length(), neckBeamDepth, 0.08);
        const riser = new THREE.Mesh(riserGeo, frameMat);
        riser.position.copy(midPos);
        riser.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.clone().normalize());
        riser.castShadow = true;
        this.hitchGroup.add(riser);

        // Lower gusset
        const gussetGeo = new THREE.BoxGeometry(0.32, 0.25, 0.02);
        const gusset = new THREE.Mesh(gussetGeo, frameMat);
        gusset.position.set(-0.20, deckHeightM + 0.12, side * railZ);
        this.hitchGroup.add(gusset);
      });

      // Horizontal Overhang
      const overhangLen = neckForwardReachM - 0.95;
      [-1, 1].forEach(side => {
        const overGeo = new THREE.BoxGeometry(overhangLen, neckBeamDepth, 0.08);
        const overMesh = new THREE.Mesh(overGeo, frameMat);
        overMesh.position.set(-0.95 - (overhangLen / 2), neckRiseHeightM, side * railZ);
        overMesh.castShadow = true;
        this.hitchGroup.add(overMesh);
      });

      // Front cross plate
      const frontCrossGeo = new THREE.BoxGeometry(0.12, neckBeamDepth, (railZ * 2) + 0.08);
      const frontCross = new THREE.Mesh(frontCrossGeo, frameMat);
      frontCross.position.set(-neckForwardReachM, neckRiseHeightM, 0);
      frontCross.castShadow = true;
      this.hitchGroup.add(frontCross);

      // Vertical Drop Tube & Ball Coupler
      const dropTubeX = -neckForwardReachM + 0.20;
      const dropTubeLength = neckRiseHeightM - ballCouplerElevationM;
      const dropTubeGeo = new THREE.CylinderGeometry(0.065, 0.065, dropTubeLength, 20);
      const dropTube = new THREE.Mesh(dropTubeGeo, frameMat);
      dropTube.position.set(dropTubeX, ballCouplerElevationM + (dropTubeLength / 2), 0);
      dropTube.castShadow = true;
      this.hitchGroup.add(dropTube);

      const gnCouplerGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.08, 20);
      const gnCoupler = new THREE.Mesh(gnCouplerGeo, hardwareMat);
      gnCoupler.position.set(dropTubeX, ballCouplerElevationM, 0);
      this.hitchGroup.add(gnCoupler);

      // Hydraulic Pump & Battery Box mounted between lower risers
      const pumpBoxGeo = new THREE.BoxGeometry(0.72, 0.45, railZ * 1.5);
      const pumpBox = new THREE.Mesh(pumpBoxGeo, blackIronMat);
      pumpBox.position.set(-0.55, deckHeightM + 0.15, 0);
      pumpBox.castShadow = true;
      this.hitchGroup.add(pumpBox);

    } else {
      // ----------------- BUMPER PULL A-FRAME FOR DUMP -----------------
      const tongueReachM = 1.45;
      const couplerPos = new THREE.Vector3(-tongueReachM, couplerElevationM, 0);

      // Converging A-frame structural channels
      [-1, 1].forEach(side => {
        const startPos = new THREE.Vector3(0, deckHeightM - 0.1, side * railZ);
        const dir = new THREE.Vector3().subVectors(couplerPos, startPos);
        const midPos = new THREE.Vector3().addVectors(startPos, couplerPos).multiplyScalar(0.5);

        const beamGeo = new THREE.BoxGeometry(dir.length(), 0.15, 0.07);
        const beamMesh = new THREE.Mesh(beamGeo, frameMat);
        beamMesh.position.copy(midPos);
        beamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.clone().normalize());
        beamMesh.castShadow = true;
        this.hitchGroup.add(beamMesh);
      });

      // Coupler Head (2-5/16" Ball Coupler)
      const couplerHousingGeo = new THREE.BoxGeometry(0.28, 0.12, 0.20);
      const couplerHousing = new THREE.Mesh(couplerHousingGeo, frameMat);
      couplerHousing.position.set(-tongueReachM + 0.05, couplerElevationM + 0.04, 0);
      couplerHousing.castShadow = true;
      this.hitchGroup.add(couplerHousing);

      const socketGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.10, 16);
      const socket = new THREE.Mesh(socketGeo, hardwareMat);
      socket.position.set(-tongueReachM - 0.04, couplerElevationM + 0.05, 0);
      socket.castShadow = true;
      this.hitchGroup.add(socket);



      // Hydraulic Pump & Deep-Cycle Battery Box mounted inside A-Frame
      const pumpBoxGeo = new THREE.BoxGeometry(0.60, 0.42, 0.50);
      const pumpBox = new THREE.Mesh(pumpBoxGeo, blackIronMat);
      pumpBox.position.set(-tongueReachM + 0.72, couplerElevationM + 0.26, 0);
      pumpBox.castShadow = true;
      this.hitchGroup.add(pumpBox);
    }
  }

  buildRamps(config, metrics) {
    // Dump trailers feature slide-in loading ramps stored in under-bed trays
    const { bedLengthM, bedWidthM, deckHeightM } = metrics;
    const frameMat = this.materials.getMaterial('frame_steel');

    [-1, 1].forEach(side => {
      const rampTrayGeo = new THREE.BoxGeometry(1.85, 0.09, 0.42);
      const rampTray = new THREE.Mesh(rampTrayGeo, frameMat);
      rampTray.position.set(bedLengthM * 0.55, deckHeightM - 0.20, side * (bedWidthM * 0.32));
      this.rampGroup.add(rampTray);
    });
  }
}
