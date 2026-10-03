/**
 * CargoTrailer.js
 * High-fidelity procedural enclosed cargo trailer.
 * Features clean aerodynamic wedge V-nose with diamond plate ATP stone guard,
 * standard A-frame tongue hitch, drop-down ramp door vs double swing barn doors,
 * 32" driver-side RV man-door, and full-side corporate / racing decals.
 */
import * as THREE from 'three';
import { MODEL_GEOMETRY } from '../core/modelGeometry.js';
import { BaseTrailer } from './BaseTrailer.js';
import { decalFactory } from '../scene/DecalFactory.js';

export class CargoTrailer extends BaseTrailer {
  constructor(scene, materialFactory) {
    super(scene, materialFactory);
  }

  buildFrame(config, metrics) {
    const { bedLengthM, bedWidthM, deckHeightM } = metrics;
    const frameColor = config.finishColor || '#27272a';
    const frameMat = this.materials.getMaterial('frame_steel', { color: frameColor });

    // Lower Tubular Steel Perimeter Frame
    [-1, 1].forEach(side => {
      const railGeo = new THREE.BoxGeometry(bedLengthM, 0.12, 0.06);
      const rail = new THREE.Mesh(railGeo, frameMat);
      rail.position.set(bedLengthM / 2, deckHeightM - 0.06, side * (bedWidthM / 2 - 0.03));
      rail.castShadow = true;
      this.chassisGroup.add(rail);
    });

    // Crossmembers
    for (let x = 0.4; x < bedLengthM - 0.2; x += 0.6) {
      const crossGeo = new THREE.BoxGeometry(0.06, 0.08, bedWidthM - 0.08);
      const cross = new THREE.Mesh(crossGeo, frameMat);
      cross.position.set(x, deckHeightM - 0.06, 0);
      cross.castShadow = true;
      this.chassisGroup.add(cross);
    }
  }

  buildDeck(config, metrics) {
    const { bedLengthM, bedWidthM, deckHeightM } = metrics;
    const skinColor = config.finishColor || '#f8fafc';
    const skinMat = this.materials.getMaterial('frame_steel', { color: skinColor });
    const trimMat = this.materials.getMaterial('zinc_hardware');
    const stoneGuardMat = this.materials.getMaterial('deck_diamond_plate');
    const interiorWood = this.materials.getMaterial('deck_wood');

    const boxHeightM = MODEL_GEOMETRY.cargoBoxHeightM;
    const vNoseLengthM = MODEL_GEOMETRY.cargoNoseLengthM;
    const halfWidthM = bedWidthM / 2;

    // 1. Interior 3/4" Plywood Floor
    const floorGeo = new THREE.BoxGeometry(bedLengthM, 0.02, bedWidthM);
    const floor = new THREE.Mesh(floorGeo, interiorWood);
    floor.position.set(bedLengthM / 2, deckHeightM + 0.01, 0);
    this.deckGroup.add(floor);

    // 2. Main Rectangular Cargo Box Body
    const boxGroup = new THREE.Group();
    boxGroup.name = 'Cargo_Box_Shell';

    // Left and Right Side Walls
    [-1, 1].forEach(side => {
      const wallZ = side * halfWidthM;
      const wallGeo = new THREE.BoxGeometry(bedLengthM, boxHeightM, 0.04);
      const wall = new THREE.Mesh(wallGeo, skinMat);
      wall.userData.cutaway = true;
      wall.position.set(bedLengthM / 2, deckHeightM + (boxHeightM / 2), wallZ);
      wall.castShadow = true;
      boxGroup.add(wall);

      // Top & Bottom Anodized Aluminum Exterior Trim
      [deckHeightM + 0.02, deckHeightM + boxHeightM - 0.02].forEach(ty => {
        const trimGeo = new THREE.BoxGeometry(bedLengthM, 0.04, 0.06);
        const trim = new THREE.Mesh(trimGeo, trimMat);
        trim.userData.cutaway = true;
        trim.position.set(bedLengthM / 2, ty, wallZ);
        boxGroup.add(trim);
      });

      // Full-Side Signage / Graphic Decal (Item 9)
      if (config.decalText && config.decalText.trim().length > 0) {
        const decalMesh = decalFactory.createDecalMesh(
          config.decalText,
          config.decalColor || '#f59e0b',
          Math.min(5.5, bedLengthM * 0.75),
          1.15,
          true
        );
        decalMesh.userData.cutaway = true;
        if (side < 0) decalMesh.rotateY(Math.PI);
        decalMesh.position.set(bedLengthM * 0.52, deckHeightM + (boxHeightM / 2), wallZ + (side * 0.026));
        boxGroup.add(decalMesh);
      }
    });

    // Roof (Seamless Aluminum Roof with subtle crown)
    const roofGeo = new THREE.BoxGeometry(bedLengthM, 0.04, bedWidthM);
    const roof = new THREE.Mesh(roofGeo, skinMat);
    roof.userData.cutaway = true;
    roof.position.set(bedLengthM / 2, deckHeightM + boxHeightM + 0.02, 0);
    roof.castShadow = true;
    boxGroup.add(roof);

    // 3. Aerodynamic Wedge V-Nose (Item 10: clean wedge replacing glitched cone)
    const vNoseGroup = this.createVNoseWedge(vNoseLengthM, halfWidthM, boxHeightM, deckHeightM, skinMat, trimMat, stoneGuardMat);
    vNoseGroup.userData.cutaway = true;
    boxGroup.add(vNoseGroup);

    // 4. Driver-Side 32" RV Man-Door (Item 12)
    if (config.cargoSideDoor) {
      this.buildSideManDoor(boxGroup, deckHeightM, halfWidthM, trimMat);
    }

    // 5. Rear Doors: Drop-Down Ramp Door vs Double Swing Doors (Item 12)
    this.buildRearCargoDoors(boxGroup, bedLengthM, bedWidthM, boxHeightM, deckHeightM, config.cargoRearDoor, skinMat, trimMat);
    this.setPose(config.cargoDoorOpenPct / 100);

    this.deckGroup.add(boxGroup);
  }

  /**
   * Constructs authentic wedge V-Nose with 24" ATP stone guard and aluminum corner caps.
   */
  createVNoseWedge(vLen, halfW, height, deckY, skinMat, trimMat, stoneGuardMat) {
    const group = new THREE.Group();
    group.name = 'Aerodynamic_VNose';

    // Left and Right Angled Nose Walls
    [-1, 1].forEach(side => {
      const pStart = new THREE.Vector3(0, deckY + height / 2, side * halfW);
      const pNose = new THREE.Vector3(-vLen, deckY + height / 2, 0);
      const dir = new THREE.Vector3().subVectors(pNose, pStart);
      const wallLen = dir.length();
      const midPos = new THREE.Vector3().addVectors(pStart, pNose).multiplyScalar(0.5);

      const noseWallGeo = new THREE.BoxGeometry(wallLen, height, 0.04);
      const noseWall = new THREE.Mesh(noseWallGeo, skinMat);
      noseWall.position.copy(midPos);
      noseWall.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.clone().normalize());
      noseWall.castShadow = true;
      group.add(noseWall);

      // 24" (0.61m) ATP Diamond Plate Stone Guard on lower section of V-nose
      const guardHeight = 0.61;
      const guardGeo = new THREE.BoxGeometry(wallLen, guardHeight, 0.05);
      const guard = new THREE.Mesh(guardGeo, stoneGuardMat);
      guard.position.set(midPos.x, deckY + guardHeight / 2, midPos.z);
      guard.quaternion.copy(noseWall.quaternion);
      guard.castShadow = true;
      group.add(guard);
    });

    // Polished Aluminum Front Nose Corner Cap (leading edge)
    const noseCapGeo = new THREE.CylinderGeometry(0.045, 0.045, height + 0.04, 16);
    const noseCap = new THREE.Mesh(noseCapGeo, trimMat);
    noseCap.position.set(-vLen, deckY + height / 2, 0);
    noseCap.castShadow = true;
    group.add(noseCap);

    // V-Nose Roof Cap
    const vRoofGeo = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      0, deckY + height + 0.02, halfW,
      0, deckY + height + 0.02, -halfW,
      -vLen, deckY + height + 0.02, 0
    ]);
    vRoofGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    vRoofGeo.computeVertexNormals();
    const vRoof = new THREE.Mesh(vRoofGeo, skinMat);
    group.add(vRoof);

    return group;
  }

  /**
   * Driver-side 32" wide RV entrance door with aluminum frame and paddle lock.
   */
  buildSideManDoor(parentGroup, deckY, halfW, trimMat) {
    const doorWidth = 0.81; // 32 inches
    const doorHeight = 1.83; // 72 inches
    const doorStartX = 1.15; // 3.8ft back from front
    const doorZ = -halfW - 0.022; // Driver side (left)

    const doorGroup = new THREE.Group();
    doorGroup.name = 'Driver_Side_Man_Door';
    doorGroup.userData.cutaway = true;

    // Extruded Aluminum Door Frame
    const frameGeo = new THREE.BoxGeometry(doorWidth + 0.06, doorHeight + 0.06, 0.02);
    const frame = new THREE.Mesh(frameGeo, trimMat);
    frame.position.set(doorStartX + doorWidth / 2, deckY + (doorHeight / 2) + 0.05, doorZ);
    doorGroup.add(frame);

    // Door Panel outline
    const panelGeo = new THREE.BoxGeometry(doorWidth, doorHeight, 0.03);
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x1f242d, roughness: 0.4 });
    panelMat.userData.owned = true;
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(doorStartX + doorWidth / 2, deckY + (doorHeight / 2) + 0.05, doorZ);
    doorGroup.add(panel);

    // Black RV Flush Paddle Lock Handle
    const handleGeo = new THREE.BoxGeometry(0.12, 0.16, 0.025);
    const handleMat = this.materials.getMaterial('black_iron');
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(doorStartX + doorWidth - 0.12, deckY + (doorHeight * 0.52), doorZ - 0.015);
    doorGroup.add(handle);

    // Top Drip Rail
    const dripGeo = new THREE.BoxGeometry(doorWidth + 0.10, 0.025, 0.035);
    const drip = new THREE.Mesh(dripGeo, trimMat);
    drip.position.set(doorStartX + doorWidth / 2, deckY + doorHeight + 0.09, doorZ);
    doorGroup.add(drip);

    parentGroup.add(doorGroup);
  }

  /**
   * Rear Cargo Doors: Spring-Assisted Ramp Door vs Double Swing Barn Doors.
   */
  buildRearCargoDoors(parent, bedLen, bedW, boxH, deckY, style, skinMat, trimMat) {
    this.rearDoorPivots = [];
    const rearX = bedLen + .02;
    if (style === 'barn') {
      const width = (bedW - .08) / 2;
      for (const side of [-1, 1]) {
        const pivot = new THREE.Group();
        pivot.name = `Cargo_Barn_Door_${side}`;
        pivot.position.set(rearX, deckY + .04, side * (bedW / 2 - .04));
        pivot.userData.side = side;
        const door = new THREE.Mesh(new THREE.BoxGeometry(.045, boxH - .08, width - .01), skinMat);
        door.position.set(0, (boxH - .08) / 2, -side * width / 2);
        door.castShadow = true; pivot.add(door);
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, boxH - .18, 12), trimMat);
        rod.position.set(.04, (boxH - .08) / 2, -side * width * .8); pivot.add(rod);
        const handle = new THREE.Mesh(new THREE.BoxGeometry(.04, .035, .18), trimMat);
        handle.position.set(.065, boxH * .4, -side * width * .8); pivot.add(handle);
        for (const y of [.18, boxH / 2, boxH - .2]) {
          const hinge = new THREE.Mesh(new THREE.BoxGeometry(.07, .065, .10), trimMat);
          hinge.position.set(.015, y, 0); pivot.add(hinge);
        }
        parent.add(pivot); this.rearDoorPivots.push(pivot);
      }
      this.rearDoorStyle = 'barn';
    } else {
      const pivot = new THREE.Group(); pivot.name = 'Cargo_Ramp_Door';
      pivot.position.set(rearX, deckY + .025, 0);
      const length = boxH - .08;
      const door = new THREE.Mesh(new THREE.BoxGeometry(.045, length, bedW - .08), skinMat);
      door.position.y = length / 2; door.castShadow = true; pivot.add(door);
      const inside = new THREE.Mesh(new THREE.BoxGeometry(.008, length - .04, bedW - .14), this.materials.getMaterial('deck_wood'));
      inside.position.set(-.028, length / 2, 0); inside.receiveShadow = true; pivot.add(inside);
      const hingeGeo = new THREE.CylinderGeometry(.025, .025, bedW - .06, 16); hingeGeo.rotateX(Math.PI / 2);
      pivot.add(new THREE.Mesh(hingeGeo, trimMat));
      for (const side of [-1, 1]) {
        const latch = new THREE.Mesh(new THREE.BoxGeometry(.045, .13, .04), trimMat);
        latch.position.set(.04, length * .65, side * (bedW / 2 - .10)); pivot.add(latch);
      }
      parent.add(pivot); this.rearDoorPivots.push(pivot);
      this.rearDoorStyle = 'ramp';
      this.openRampAngle = -Math.acos(-Math.min(.95, (deckY + .025) / length));
    }
  }

  setPose(value) {
    this.pose = value;
    for (const pivot of this.rearDoorPivots || []) {
      if (this.rearDoorStyle === 'barn') pivot.rotation.y = -pivot.userData.side * Math.PI / 2 * value;
      else pivot.rotation.z = this.openRampAngle * value;
    }
  }

  /**
   * Standard A-Frame Tongue Hitch (Item 11: standardized across all cargo sizes).
   */
  buildHitch(config, metrics) {
    const { bedWidthM, couplerHeightIn } = metrics;
    const frameColor = config.finishColor || '#27272a';
    const frameMat = this.materials.getMaterial('frame_steel', { color: frameColor });
    const hardwareMat = this.materials.getMaterial('zinc_hardware');

    const tongueReachM = 1.45;
    const couplerElevationM = (couplerHeightIn || 19) * 0.0254;
    const couplerPos = new THREE.Vector3(-tongueReachM, couplerElevationM, 0);
    const railZ = bedWidthM * 0.38;

    // Two converging structural A-frame channel beams
    [-1, 1].forEach(side => {
      const startPos = new THREE.Vector3(0, couplerElevationM + 0.12, side * railZ);
      const dir = new THREE.Vector3().subVectors(couplerPos, startPos);
      const midPos = new THREE.Vector3().addVectors(startPos, couplerPos).multiplyScalar(0.5);

      const beamGeo = new THREE.BoxGeometry(dir.length(), 0.14, 0.06);
      const beamMesh = new THREE.Mesh(beamGeo, frameMat);
      beamMesh.position.copy(midPos);
      beamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.clone().normalize());
      beamMesh.castShadow = true;
      this.hitchGroup.add(beamMesh);
    });

    // 2-5/16" Ball Coupler Head
    const couplerHousingGeo = new THREE.BoxGeometry(0.28, 0.12, 0.20);
    const couplerHousing = new THREE.Mesh(couplerHousingGeo, frameMat);
    couplerHousing.position.set(-tongueReachM + 0.05, couplerElevationM + 0.04, 0);
    couplerHousing.castShadow = true;
    this.hitchGroup.add(couplerHousing);

    const socketGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.10, 16);
    const socket = new THREE.Mesh(socketGeo, hardwareMat);
    socket.position.set(-tongueReachM, couplerElevationM + 0.05, 0);
    socket.castShadow = true;
    this.hitchGroup.add(socket);


  }

  buildRamps(config, metrics) {
    // Ramps are integrated into the rear door assembly
  }
}
