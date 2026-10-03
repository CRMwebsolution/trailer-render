/**
 * TowTruck.js
 * High-fidelity procedural 3D model of the 2016 Ford F-250 SRW Crew Cab 6.5ft Bed,
 * with full GLTF/GLB custom 3D asset loading support.
 * Aligns automatically with Bumper Pull receiver or Gooseneck ball to verify real-world clearances.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FORD_F250_65_SPECS } from '../core/PhysicsMetrics.js';

export class TowTruck {
  constructor(materialFactory) {
    this.materials = materialFactory;
    this.group = new THREE.Group();
    this.group.name = 'Tow_Truck_Group';

    // Sub-groups for procedural vs custom 3D model
    this.proceduralTruckGroup = new THREE.Group();
    this.proceduralTruckGroup.name = 'Tow_Truck_F250_Procedural';
    this.group.add(this.proceduralTruckGroup);

    this.customTruckGroup = new THREE.Group();
    this.customTruckGroup.name = 'Tow_Truck_Custom_Model';
    this.customTruckGroup.visible = false;
    this.group.add(this.customTruckGroup);

    this.isCustom = false;
    this.customModelName = '';
    this.visible = false;
    this.group.visible = false;

    this.buildTruck();

  }

  buildTruck() {
    const target = this.proceduralTruckGroup;

    // Materials
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0, // Ingot Silver / Oxford White
      metalness: 0.7,
      roughness: 0.28,
      envMapIntensity: 1.2
    });

    const chromeMat = this.materials.getMaterial('zinc_hardware');
    const blackMat = this.materials.getMaterial('black_iron');
    const tireMat = this.materials.getMaterial('tire_rubber');
    const rimMat = this.materials.getMaterial('wheel_rim');
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.85
    });

    // Reference dimensions (meters)
    // Ball located over rear axle at local (0, 0, 0)
    // Rear bumper receiver is at +0.985m (+X)
    // Cab rear wall is at -1.092m (-X)
    // Front bumper is at -4.95m (-X)
    const truckWidth = 2.03; // 80 inches
    const bedRailY = 1.41;   // 55.5 inches
    const bedFloorY = 0.89;  // 35.0 inches
    const cabHeightY = 2.02; // ~79.5 inches

    // 1. Truck Bed (Sides, floor, tailgate)
    // Bed floor
    const bedFloorGeo = new THREE.BoxGeometry(2.05, 0.05, truckWidth - 0.15);
    const bedFloor = new THREE.Mesh(bedFloorGeo, blackMat);
    bedFloor.position.set(-0.05, bedFloorY, 0);
    bedFloor.castShadow = true;
    bedFloor.receiveShadow = true;
    target.add(bedFloor);

    // Bed side walls
    const bedWallHeight = bedRailY - bedFloorY;
    [-1, 1].forEach(side => {
      const sideGeo = new THREE.BoxGeometry(2.05, bedWallHeight, 0.12);
      const sideMesh = new THREE.Mesh(sideGeo, bodyMat);
      sideMesh.position.set(-0.05, bedFloorY + bedWallHeight / 2, side * (truckWidth / 2 - 0.06));
      sideMesh.castShadow = true;
      target.add(sideMesh);

      // Bed rail caps
      const capGeo = new THREE.BoxGeometry(2.08, 0.03, 0.14);
      const capMesh = new THREE.Mesh(capGeo, blackMat);
      capMesh.position.set(-0.05, bedRailY + 0.015, side * (truckWidth / 2 - 0.06));
      target.add(capMesh);
    });

    // Tailgate (closed)
    const gateGeo = new THREE.BoxGeometry(0.10, bedWallHeight, truckWidth - 0.12);
    const gateMesh = new THREE.Mesh(gateGeo, bodyMat);
    gateMesh.position.set(0.97, bedFloorY + bedWallHeight / 2, 0);
    gateMesh.castShadow = true;
    target.add(gateMesh);

    // Rear step bumper with Class V 2.5" receiver
    const bumperGeo = new THREE.BoxGeometry(0.18, 0.15, truckWidth);
    const bumperMesh = new THREE.Mesh(bumperGeo, chromeMat);
    bumperMesh.position.set(1.10, 0.52, 0);
    bumperMesh.castShadow = true;
    target.add(bumperMesh);

    // Receiver socket at 19" height (0.483m)
    const recSocketGeo = new THREE.BoxGeometry(0.12, 0.08, 0.08);
    const recSocket = new THREE.Mesh(recSocketGeo, blackMat);
    recSocket.position.set(1.18, 0.483, 0);
    target.add(recSocket);

    // Gooseneck 2-5/16" Ball in bed floor (at local X = 0)
    const ballGeo = new THREE.SphereGeometry(0.045, 16, 16);
    const ball = new THREE.Mesh(ballGeo, chromeMat);
    ball.position.set(0, bedFloorY + 0.06, 0);
    target.add(ball);

    // 2. Crew Cab Cabin
    const cabLength = 2.45;
    const cabStartX = -1.092; // 43 inches from ball
    const cabGeo = new THREE.BoxGeometry(cabLength, cabHeightY - 0.70, truckWidth - 0.08);
    const cabMesh = new THREE.Mesh(cabGeo, bodyMat);
    cabMesh.position.set(cabStartX - cabLength / 2, 0.70 + (cabHeightY - 0.70) / 2, 0);
    cabMesh.castShadow = true;
    target.add(cabMesh);

    // Windshield & Windows
    const glassGeo = new THREE.BoxGeometry(cabLength * 0.9, 0.55, truckWidth + 0.01);
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.position.set(cabStartX - cabLength / 2 - 0.1, 1.55, 0);
    target.add(glassMesh);

    // 3. Engine Hood & Front Grille
    const hoodLength = 1.45;
    const hoodStartX = cabStartX - cabLength;
    const hoodGeo = new THREE.BoxGeometry(hoodLength, 0.55, truckWidth - 0.10);
    const hoodMesh = new THREE.Mesh(hoodGeo, bodyMat);
    hoodMesh.position.set(hoodStartX - hoodLength / 2, 1.25, 0);
    hoodMesh.castShadow = true;
    target.add(hoodMesh);

    // Big Chrome Super Duty Grille
    const grilleGeo = new THREE.BoxGeometry(0.08, 0.60, truckWidth - 0.18);
    const grille = new THREE.Mesh(grilleGeo, chromeMat);
    grille.position.set(hoodStartX - hoodLength, 1.15, 0);
    grille.castShadow = true;
    target.add(grille);

    // Front Bumper
    const frontBumperGeo = new THREE.BoxGeometry(0.18, 0.22, truckWidth);
    const frontBumper = new THREE.Mesh(frontBumperGeo, chromeMat);
    frontBumper.position.set(hoodStartX - hoodLength - 0.05, 0.62, 0);
    frontBumper.castShadow = true;
    target.add(frontBumper);

    // Headlights
    [-1, 1].forEach(side => {
      const lightGeo = new THREE.BoxGeometry(0.06, 0.22, 0.25);
      const lightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6 });
      const light = new THREE.Mesh(lightGeo, lightMat);
      light.position.set(hoodStartX - hoodLength + 0.02, 1.22, side * (truckWidth / 2 - 0.22));
      target.add(light);
    });

    // 4. Wheels & Tires
    // Rear wheels (at local X = 0)
    // Front wheels (wheelbase 3.97m forward: at local X = -3.97m)
    [0, -3.97].forEach(wheelX => {
      [-1, 1].forEach(side => {
        const wheelGroup = new THREE.Group();
        const tireRadius = 0.42; // ~33" tire
        const tireWidth = 0.26;

        const tGeo = new THREE.CylinderGeometry(tireRadius, tireRadius, tireWidth, 24);
        tGeo.rotateX(Math.PI / 2);
        const tMesh = new THREE.Mesh(tGeo, tireMat);
        tMesh.castShadow = true;
        wheelGroup.add(tMesh);

        const rGeo = new THREE.CylinderGeometry(0.24, 0.24, tireWidth + 0.01, 16);
        rGeo.rotateX(Math.PI / 2);
        const rMesh = new THREE.Mesh(rGeo, rimMat);
        wheelGroup.add(rMesh);

        wheelGroup.position.set(wheelX, tireRadius, side * (truckWidth / 2));
        target.add(wheelGroup);
      });
    });

    // Side Towing Mirrors
    [-1, 1].forEach(side => {
      const mirrorGeo = new THREE.BoxGeometry(0.18, 0.14, 0.08);
      const mirror = new THREE.Mesh(mirrorGeo, blackMat);
      mirror.position.set(cabStartX - cabLength + 0.25, 1.55, side * (truckWidth / 2 + 0.16));
      target.add(mirror);
    });
  }

  async loadCustomTruck(source, name = 'Custom truck') {
    const request = this.loadRequest = (this.loadRequest || 0) + 1;
    const loader = new GLTFLoader();
    let gltf;
    if (source instanceof Blob) {
      if (source.size > 75 * 1024 * 1024) throw new Error('Choose a model smaller than 75 MB.');
      const bytes = await source.arrayBuffer();
      if (source.name?.toLowerCase().endsWith('.gltf')) {
        const contents = JSON.parse(new TextDecoder().decode(bytes));
        const resources = [...(contents.buffers || []), ...(contents.images || [])];
        if (resources.some(resource => resource.uri && !resource.uri.startsWith('data:'))) {
          throw new Error('This GLTF needs external files. Export a single GLB with embedded textures instead.');
        }
      }
      gltf = await loader.parseAsync(bytes, '');
    } else if (typeof source === 'string') {
      gltf = await loader.loadAsync(source);
    } else throw new Error('Choose a GLB or a self-contained GLTF model.');
    if (this.disposed || request !== this.loadRequest) {
      this.disposeImported(gltf.scene);
      throw new Error('Model loading was cancelled.');
    }
    try { this.applyCustomModel(gltf.scene, name); }
    catch (error) { this.disposeImported(gltf.scene); throw error; }
    return name;
  }

  applyCustomModel(model, name) {
    const initial = new THREE.Box3().setFromObject(model);
    const size = initial.getSize(new THREE.Vector3());
    const length = Math.max(size.x, size.z);
    if (!Number.isFinite(length) || length < .0001) throw new Error('This model contains no visible geometry.');
    this.disposeImported(this.customTruckGroup);
    this.customTruckGroup.clear();
    const pivot = new THREE.Group();
    pivot.add(model);
    this.customTruckGroup.add(pivot);
    this.customPivot = pivot;
    this.baseRotation = size.z > size.x * 1.25 ? Math.PI / 2 : 0;
    this.baseScale = (length > 50 || length < 1 || Math.abs(length - 5.8) > 2) ? 5.8 / length : 1;
    this.customScale = 1; this.customOffset = 0; this.customFlip = false;
    model.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
    this.isCustom = true;
    this.customModelName = name;
    this.proceduralTruckGroup.visible = false;
    this.customTruckGroup.visible = true;
    this.adjustCustomModel({});
  }

  adjustCustomModel({ scale = this.customScale, offset = this.customOffset, flip = this.customFlip } = {}) {
    if (!this.isCustom) return;
    this.customScale = scale; this.customOffset = offset; this.customFlip = flip;
    const pivot = this.customPivot;
    pivot.position.set(0, 0, 0);
    pivot.scale.setScalar(this.baseScale * scale);
    pivot.rotation.y = this.baseRotation + (flip ? Math.PI : 0);
    pivot.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(pivot);
    const center = bounds.getCenter(new THREE.Vector3());
    pivot.position.set(1.05 - bounds.max.x + offset, -bounds.min.y, -center.z);
    pivot.updateMatrixWorld(true);
  }

  resetToProcedural() {
    this.loadRequest = (this.loadRequest || 0) + 1;
    this.disposeImported(this.customTruckGroup);
    this.customTruckGroup.clear();
    this.isCustom = false; this.customModelName = '';
    this.customTruckGroup.visible = false;
    this.proceduralTruckGroup.visible = true;
  }

  disposeImported(root) {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    root.traverse(child => {
      if (child.geometry) geometries.add(child.geometry);
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
        if (!material) continue;
        materials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      }
    });
    geometries.forEach(geometry => geometry.dispose());
    textures.forEach(texture => texture.dispose());
    materials.forEach(material => material.dispose());
  }

  /**
   * Aligns truck relative to the trailer hitch.
   */
  updatePosition(metrics, hitchStyle, isVisible) {
    this.visible = isVisible;
    this.group.visible = isVisible;

    if (!isVisible) return;

    if (hitchStyle === 'bumper_pull') {
      // Bumper Pull: Trailer coupler is at X = -1.45m, Y = 0.483m
      // Truck receiver is at local +1.18m
      // So truck position X = -1.45 - 1.18 = -2.63m
      this.group.position.set(-2.63, 0, 0);
    } else {
      // Gooseneck: Trailer ball coupler is at X = -2.14m, Y = 0.889m (35")
      // Truck gooseneck ball is at local (0, 0.89m, 0)
      // So truck position X = -2.14m
      this.group.position.set(-2.14, 0, 0);
    }
  }

  dispose() {
    this.disposed = true;
    this.loadRequest = (this.loadRequest || 0) + 1;
    this.disposeImported(this.customTruckGroup);
    const shared = new Set(this.materials.cache.values());
    const owned = new Set();
    this.proceduralTruckGroup.traverse(child => {
      child.geometry?.dispose();
      if (child.material && !shared.has(child.material)) owned.add(child.material);
    });
    owned.forEach(material => material.dispose());
    this.group.clear();
    this.group.removeFromParent();
  }
}
