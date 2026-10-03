/**
 * TowTruck.js
 * Adjustable generic pickup reference,
 * with full GLTF/GLB custom 3D asset loading support.
 * Provides visual hitch alignment; real towing compatibility and clearances are not verified.
 */
import * as THREE from 'three';
import { DEFAULT_CONFIG, normalizeConfig } from '../core/config.js';
import { MODEL_GEOMETRY } from '../core/modelGeometry.js';
import { truckGeometry } from '../core/truckGeometry.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export class TowTruck {
  constructor(materialFactory) {
    this.materials = materialFactory;
    this.group = new THREE.Group();
    this.group.name = 'Tow_Truck_Group';

    // Sub-groups for procedural vs custom 3D model
    this.proceduralTruckGroup = new THREE.Group();
    this.proceduralTruckGroup.name = 'Tow_Truck_Procedural_Reference';
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

  clearProcedural() {
    const geometry = new Set(), owned = new Set();
    this.proceduralTruckGroup.traverse(object => {
      if (object.geometry) geometry.add(object.geometry);
      if (object.material?.userData.owned) owned.add(object.material);
      if (object.isInstancedMesh) object.dispose();
    });
    geometry.forEach(item => item.dispose()); owned.forEach(item => item.dispose()); this.proceduralTruckGroup.clear();
  }

  buildTruck(config = DEFAULT_CONFIG) {
    this.clearProcedural(); this.config = normalizeConfig(config); this.dimensions = truckGeometry(this.config);
    this.dimensionKey = [this.config.truckWheelbaseIn, this.config.truckWidthIn, this.config.truckRearHitchOffsetIn].join('|');
    const target = this.proceduralTruckGroup, d = this.dimensions;
    const body = this.materials.getMaterial('frame_steel', { color: '#e2e8f0', sheen: 'gloss' });
    const chrome = this.materials.getMaterial('zinc_hardware'), black = this.materials.getMaterial('black_iron');
    const rubber = this.materials.getMaterial('tire_rubber'), rim = this.materials.getMaterial('wheel_rim');
    const glass = new THREE.MeshPhysicalMaterial({ color: '#18232f', metalness: 0, roughness: .12, clearcoat: .8 });
    glass.userData.owned = true;
    const lights = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: .55 });
    lights.userData.owned = true;
    const box = (name, size, position, material, radius = 0) => {
      const mesh = new THREE.Mesh(radius ? new RoundedBoxGeometry(...size, 2, radius) : new THREE.BoxGeometry(...size), material);
      mesh.name = name; mesh.position.set(...position); mesh.castShadow = mesh.receiveShadow = true; target.add(mesh); return mesh;
    };
    const bedY = .89, railY = 1.41, roofY = 2.02, width = d.widthM;
    box('Pickup_Bed_Floor', [d.bedLengthM, .05, width - .15], [d.bedCenterX, bedY, 0], black);
    for (const side of [-1, 1]) {
      box('Pickup_Bed_Side', [d.bedLengthM + .03, railY - bedY, .06], [d.bedCenterX, (railY + bedY) / 2, side * (width / 2 - .035)], body, .012);
      box('Bed_Rail_Cap', [d.bedLengthM + .04, .025, .11], [d.bedCenterX, railY + .012, side * (width / 2 - .05)], black);
    }
    box('Tailgate', [.07, railY - bedY, width - .12], [d.rearBodyX, (railY + bedY) / 2, 0], body, .012);
    box('Rear_Step_Bumper', [.18, .15, width], [d.hitchOffsetM - .08, .52, 0], chrome, .025);
    box('Receiver', [.12, .08, .08], [d.hitchOffsetM - .06, .483, 0], black);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(.035, 16, 12), chrome);
    ball.position.set(d.hitchOffsetM, .515, 0); target.add(ball);
    const bedBall = new THREE.Mesh(new THREE.SphereGeometry(.035, 16, 12), chrome); bedBall.position.set(0, .93, 0); target.add(bedBall);
    box('Pickup_Cab', [d.cabLengthM, roofY - .70, width - .08], [d.cabRearX - d.cabLengthM / 2, (.70 + roofY) / 2, 0], body, .06);
    for (const side of [-1, 1]) {
      for (const fraction of [.26, .73]) {
        box('Side_Window', [d.cabLengthM * .40, .49, .018], [d.cabRearX - d.cabLengthM * fraction, 1.57, side * (width / 2 - .035)], glass, .006);
        box('Door_Handle', [.13, .025, .025], [d.cabRearX - d.cabLengthM * fraction + .14, 1.22, side * (width / 2 - .03)], black, .005);
      }
      box('Door_Seam', [.008, .74, .012], [d.cabRearX - d.cabLengthM * .5, 1.15, side * (width / 2 - .035)], black);
      box('Towing_Mirror', [.18, .14, .10], [d.hoodStartX + .26, 1.55, side * (width / 2 + .16)], black, .018);
    }
    box('Windshield', [.018, .52, width - .20], [d.hoodStartX - .008, 1.58, 0], glass);
    box('Rear_Cab_Window', [.018, .42, width - .28], [d.cabRearX + .008, 1.57, 0], glass);
    box('Pickup_Hood', [1.45, .55, width - .10], [d.hoodEndX + .725, 1.25, 0], body, .045);
    box('Front_Grille', [.08, .60, width - .18], [d.hoodEndX, 1.15, 0], chrome, .015);
    for (const y of [.96, 1.10, 1.24]) box('Grille_Slat', [.015, .045, width * .61], [d.hoodEndX - .045, y, 0], black);
    box('Front_Bumper', [.18, .22, width], [d.hoodEndX - .05, .62, 0], chrome, .025);
    for (const side of [-1, 1]) {
      box('Headlight', [.045, .20, .25], [d.hoodEndX - .035, 1.31, side * (width / 2 - .20)], lights, .008);
      box('Rear_Tail_Light', [.028, .21, .095], [d.rearBodyX + .055, 1.07, side * (width / 2 - .09)], this.materials.getMaterial('light_tail_red'), .008);
    }
    for (const wheelX of [0, -d.wheelbaseM]) for (const side of [-1, 1]) {
      const wheel = new THREE.Group(); wheel.name = wheelX === 0 ? 'Pickup_Rear_Wheel' : 'Pickup_Front_Wheel';
      wheel.position.set(wheelX, .42, side * (width / 2 + .015));
      const tireGeo = new THREE.LatheGeometry([new THREE.Vector2(.24, -.11), new THREE.Vector2(.35, -.13), new THREE.Vector2(.40, -.11), new THREE.Vector2(.42, -.07), new THREE.Vector2(.42, .07), new THREE.Vector2(.40, .11), new THREE.Vector2(.35, .13), new THREE.Vector2(.24, .11), new THREE.Vector2(.24, -.11)], 36); tireGeo.rotateX(Math.PI / 2);
      const tire = new THREE.Mesh(tireGeo, rubber); tire.castShadow = true; wheel.add(tire);
      const rimGeo = new THREE.CylinderGeometry(.225, .225, .25, 28); rimGeo.rotateX(Math.PI / 2);
      wheel.add(new THREE.Mesh(rimGeo, rim));
      const bead = new THREE.Mesh(new THREE.TorusGeometry(.23, .012, 8, 32), rim); bead.position.z = side * .135; wheel.add(bead);
      const hubGeo = new THREE.CylinderGeometry(.055, .055, .04, 16); hubGeo.rotateX(Math.PI / 2);
      const hub = new THREE.Mesh(hubGeo, chrome); hub.position.z = side * .135; wheel.add(hub);
      const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion();
      const tread = new THREE.InstancedMesh(new THREE.BoxGeometry(.045, .008, .055), rubber, 96);
      for (let row = 0; row < 2; row++) for (let i = 0; i < 48; i++) {
        const angle = (i + row * .4) / 48 * Math.PI * 2; rotation.setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle + Math.PI / 2);
        matrix.compose(new THREE.Vector3(Math.cos(angle) * .42, Math.sin(angle) * .42, (row - .5) * .11), rotation, new THREE.Vector3(1, 1, 1)); tread.setMatrixAt(row * 48 + i, matrix);
      }
      tread.castShadow = true; wheel.add(tread); target.add(wheel);
    }
  }

  updateDimensions(config) {
    const s = normalizeConfig(config), key = [s.truckWheelbaseIn, s.truckWidthIn, s.truckRearHitchOffsetIn].join('|');
    if (key !== this.dimensionKey) this.buildTruck(s);
  }
  getBounds() { this.group.updateMatrixWorld(true); return new THREE.Box3().setFromObject(this.isCustom ? this.customTruckGroup : this.proceduralTruckGroup); }

  async loadCustomTruck(source, name = 'Custom truck') {
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
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
    pivot.position.set((this.dimensions?.hitchOffsetM || 1.18) - bounds.max.x + offset, -bounds.min.y, -center.z);
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
      this.group.position.set(-MODEL_GEOMETRY.bumperTongueM - this.dimensions.hitchOffsetM, 0, 0);
    } else {
      // Gooseneck: Trailer ball coupler is at X = -2.14m, Y = 0.889m (35")
      // Truck gooseneck ball is at local (0, 0.89m, 0)
      // So truck position X = -2.14m
      this.group.position.set(-MODEL_GEOMETRY.gooseneckReachM, 0, 0);
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
