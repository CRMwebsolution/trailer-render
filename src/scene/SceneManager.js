import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CameraController } from './CameraController.js';
import { MaterialFactory } from './MaterialFactory.js';
import { DimensionOverlay } from './DimensionOverlay.js';
import { TowTruck } from './TowTruck.js';
import { trailerFactory } from '../trailers/TrailerFactory.js';
import { decalFactory } from './DecalFactory.js';
import { measurementValues, formatDistance } from '../core/modelGeometry.js';
import { PartInspector } from './PartInspector.js';

const GEOMETRY_KEYS = ['trailerType', 'bedLengthFt', 'trailerWidthIn', 'fenderStyle',
  'payloadClass', 'hitchStyle', 'deckMaterial', 'finishColor', 'rampStyle', 'rampLengthFt',
  'dumpDoorStyle', 'cargoRearDoor', 'cargoSideDoor',
  'decalText', 'decalColor'];
const DIMENSION_KEYS = ['bedLengthFt', 'trailerWidthIn', 'payloadClass', 'fenderStyle', 'showDimensions', 'measurementMode', 'measurementUnits', 'hitchStyle', 'trailerType'];

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.container = canvas.parentElement;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#eef0f3');
    this.camera = new THREE.PerspectiveCamera(42, 1, .05, 150);
    this.camera.position.set(-4, 4, 8);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'default' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.running = true;
    this.frame = 0;
    this.render = this.render.bind(this);
    this.requestRender = this.requestRender.bind(this);
    this.cameraController = new CameraController(this.camera, canvas, this.requestRender);
    this.materials = new MaterialFactory();
    this.dimensionOverlay = new DimensionOverlay(this.scene);
    this.partInspector = new PartInspector(this.scene, canvas, () => this.activeTrailer?.rootGroup, detail => {
      canvas.dispatchEvent(new CustomEvent('part-selected', { detail })); this.requestRender();
    });
    this.partInspector.setCamera(this.camera);
    this.towTruck = new TowTruck(this.materials);
    this.scene.add(this.towTruck.group);
    this.setupLighting();
    this.setupEnvironment();
    this.setupGround();
    this.setupShowroom();
    this.applyQuality('auto');
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);
    this.events = new AbortController();
    document.addEventListener('visibilitychange', () => {
      this.lastFrameTime = 0;
      if (!document.hidden) this.requestRender();
    }, { signal: this.events.signal });
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      this.contextLost = true;
      const status = document.getElementById('viewport-status');
      status.hidden = false;
      status.textContent = 'The 3D view paused while the graphics context recovers.';
    }, { signal: this.events.signal });
    canvas.addEventListener('webglcontextrestored', () => {
      this.contextLost = false;
      document.getElementById('viewport-status').hidden = true;
      this.markShadowsDirty(); this.requestRender();
    }, { signal: this.events.signal });
    this.handleResize();
  }

  setupLighting() {
    this.hemiLight = new THREE.HemisphereLight(0xf1f5fb, 0xa4aab3, 2.1);
    this.scene.add(this.hemiLight);
    this.dirLight = new THREE.DirectionalLight(0xfff8ee, 3.8);
    this.dirLight.position.set(-3, 12, 8);
    this.dirLight.castShadow = true;
    Object.assign(this.dirLight.shadow.camera, { near: .5, far: 60, left: -18, right: 18, top: 18, bottom: -18 });
    this.dirLight.shadow.mapSize.set(2048, 2048);
    this.dirLight.shadow.bias = -.00025;
    this.dirLight.shadow.normalBias = .025;
    this.dirLight.shadow.radius = 3;
    this.scene.add(this.dirLight, this.dirLight.target);
    this.rimLight = new THREE.DirectionalLight(0xc5d9f7, 2);
    this.rimLight.position.set(9, 5, -7);
    this.scene.add(this.rimLight);
    this.underFill = new THREE.DirectionalLight(0xffffff, .6);
    this.underFill.position.set(-3, 2, 10);
    this.scene.add(this.underFill);
  }

  setupEnvironment() {
    const generator = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.environmentTarget = generator.fromScene(room, .04);
    this.scene.environment = this.environmentTarget.texture;
    this.scene.environmentIntensity = .85;
    room.dispose(); generator.dispose();
  }

  setupGround() {
    this.groundMat = new THREE.MeshStandardMaterial({ color: '#e4e7eb', roughness: .92, metalness: 0 });
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), this.groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -.015;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
    this.grid = new THREE.GridHelper(40, 40, 0x4e5e72, 0x344254);
    this.grid.position.y = -.01;
    this.scene.add(this.grid);
  }

  setupShowroom() {
    this.showroomGroup = new THREE.Group();
    this.showroomGroup.name = 'Showroom_Stage';
    this.showroomGroup.visible = false;

    // 1. Polished Display Turntable Platform
    const stageRadius = 14.5;
    const stageHeight = 0.08;
    const stageGeo = new THREE.CylinderGeometry(stageRadius, stageRadius + 0.5, stageHeight, 64);
    const stageMat = new THREE.MeshStandardMaterial({
      color: 0x1e2430, // Sleek modern dark slate
      roughness: 0.18,  // Polished reflective finish
      metalness: 0.35,
      envMapIntensity: 1.4
    });
    this.showroomStage = new THREE.Mesh(stageGeo, stageMat);
    this.showroomStage.position.set(2.5, -stageHeight / 2, 0);
    this.showroomStage.receiveShadow = true;
    this.showroomGroup.add(this.showroomStage);

    // 2. Brushed Aluminum Chamfer Bevel Ring
    const bevelGeo = new THREE.RingGeometry(stageRadius - 0.2, stageRadius + 0.5, 64);
    bevelGeo.rotateX(-Math.PI / 2);
    const bevelMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.2
    });
    const bevelRing = new THREE.Mesh(bevelGeo, bevelMat);
    bevelRing.position.set(2.5, 0.001, 0);
    this.showroomGroup.add(bevelRing);

    // 3. Neon LED Halo Perimeter Ring (Cyan accent ring)
    const haloGeo = new THREE.RingGeometry(stageRadius - 0.35, stageRadius - 0.2, 64);
    haloGeo.rotateX(-Math.PI / 2);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8
    });
    const haloRing = new THREE.Mesh(haloGeo, haloMat);
    haloRing.position.set(2.5, 0.002, 0);
    this.showroomGroup.add(haloRing);

    // 4. Overhead Studio Softbox Light Banks
    const softboxHousingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
    const softboxLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const softboxMaterials = [
      softboxHousingMat, softboxHousingMat,
      softboxHousingMat, // +Y top
      softboxLightMat,   // -Y bottom light diffuser
      softboxHousingMat, softboxHousingMat
    ];

    // Center long softbox bank
    const centerSoftboxGeo = new THREE.BoxGeometry(16, 0.15, 3.5);
    const centerBank = new THREE.Mesh(centerSoftboxGeo, softboxMaterials);
    centerBank.position.set(2.5, 8.5, 0);
    centerBank.visible = false;
    this.showroomGroup.add(centerBank);

    // Left and Right Angled Accent Softboxes
    const sideSoftboxGeo = new THREE.BoxGeometry(14, 0.15, 2.0);
    const leftBank = new THREE.Mesh(sideSoftboxGeo, softboxMaterials);
    leftBank.position.set(2.5, 7.8, 5.2);
    leftBank.rotation.x = -0.35;
    leftBank.visible = false;
    this.showroomGroup.add(leftBank);

    const rightBank = new THREE.Mesh(sideSoftboxGeo, softboxMaterials);
    rightBank.position.set(2.5, 7.8, -5.2);
    rightBank.rotation.x = 0.35;
    rightBank.visible = false;
    this.showroomGroup.add(rightBank);

    // 5. Dedicated Showroom Key Spotlight
    this.showroomSpot = new THREE.SpotLight(0xfff7ed, 4.2, 35, Math.PI / 4, 0.45, 1.2);
    this.showroomSpot.position.set(2.5, 11, 4);
    this.showroomSpot.target.position.set(2.5, 0, 0);
    this.showroomSpot.castShadow = true;
    this.showroomSpot.shadow.bias = -0.0003;
    this.showroomGroup.add(this.showroomSpot);
    this.showroomGroup.add(this.showroomSpot.target);

    // 6. Warm Amber Floor Accent Light
    this.showroomPoint = new THREE.PointLight(0xf59e0b, 1.8, 20);
    this.showroomPoint.position.set(2.5, 0.6, -7);
    this.showroomGroup.add(this.showroomPoint);

    // 7. Architectural Curved Cyc Studio Wall in the distance
    const cycGeo = new THREE.CylinderGeometry(28, 28, 16, 48, 1, true, -Math.PI * 0.4, Math.PI * 0.8);
    const cycMat = new THREE.MeshStandardMaterial({
      color: 0x161e2e,
      roughness: 0.75,
      metalness: 0.15,
      side: THREE.BackSide
    });
    const cycWall = new THREE.Mesh(cycGeo, cycMat);
    cycWall.position.set(2.5, 7.5, 0);
    this.showroomGroup.add(cycWall);

    this.scene.add(this.showroomGroup);
  }

  setBackgroundMode(mode) {
    if (this.currentEnvMode === mode) return;
    this.currentEnvMode = mode;
    this.container.dataset.environment = mode;
    const studio = mode === 'white';
    this.scene.background.set(studio ? '#eef0f3' : mode === 'showroom' ? '#1b2635' : '#19212d');
    this.groundMat.color.set(studio ? '#e4e7eb' : '#1b2635');
    this.ground.visible = mode !== 'showroom';
    this.grid.visible = mode === 'black';
    this.showroomGroup.visible = mode === 'showroom';
    this.hemiLight.intensity = studio ? 2.1 : 1.6;
    this.dirLight.intensity = studio ? 3.8 : 4.4;
    this.rimLight.intensity = studio ? 2 : 2.6;
    this.scene.environmentIntensity = studio ? .85 : 1.05;
    this.markShadowsDirty();
  }

  applyQuality(quality) {
    const smallScreen = window.matchMedia('(max-width: 820px)').matches;
    const low = quality === 'low';
    const pixelCap = low ? 1 : quality === 'high' ? 2 : smallScreen ? 1.25 : 1.75;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelCap));
    this.renderer.shadowMap.enabled = !low;
    this.markShadowsDirty();
  }

  markShadowsDirty() { this.renderer.shadowMap.needsUpdate = true; }

  updateTrailer(state, metrics, previous) {
    this.state = state; this.metrics = metrics;
    this.setBackgroundMode(state.environmentMode);
    const changed = key => !previous || previous[key] !== state[key];
    if (changed('renderQuality')) { this.applyQuality(state.renderQuality); this.handleResize(false); }
    const geometryChanged = GEOMETRY_KEYS.some(changed);
    if (geometryChanged) this.partInspector.clear();
    if (changed('inspectMode')) this.partInspector.setEnabled(state.inspectMode);
    const sameType = this.activeTrailer && this.currentType === state.trailerType;
    this.finishMotion();
    const poseKey = state.trailerType === 'dump' ? 'dumpAngleDeg' : state.trailerType === 'cargo' ? 'cargoDoorOpenPct' : 'rampDeploymentPct';
    const divisor = state.trailerType === 'dump' ? 42 : 100;
    const poseOnly = sameType && !geometryChanged && changed(poseKey);
    if (geometryChanged) {
      if (!sameType) {
        this.activeTrailer?.dispose();
        this.activeTrailer = trailerFactory.create(state.trailerType, this.scene, this.materials);
        this.currentType = state.trailerType;
      }
      this.activeTrailer.build(state, metrics);
      this.markShadowsDirty();
    } else if (poseOnly) {
      this.activeTrailer.currentConfig = state;
      const target = state[poseKey] / divisor;
      const current = this.activeTrailer.pose || 0;
      const sliderPose = state.trailerType === 'dump' ? state.dumpBedPosition === 'custom' : state.trailerType === 'cargo' ? state.cargoDoorPosition === 'custom' : state.rampPosition === 'custom';
      this.activeTrailer.setPose(target);
      this.setCameraPreset(state.cameraPreset, undefined, false, sliderPose);
      if (!sliderPose && !this.cameraController.reducedMotion.matches) {
        this.activeTrailer.setPose(current);
        this.motion = { from: current, to: target, elapsed: 0 };
      }
      this.markShadowsDirty();
    }
    if (geometryChanged || changed('jackExtensionPct')) {
      this.activeTrailer.setJackPose(state.jackExtensionPct / 100); this.markShadowsDirty();
    }
    if (geometryChanged || poseOnly || changed('jackExtensionPct') || DIMENSION_KEYS.some(changed)) this.refreshDimensions();
    this.towTruck.updatePosition(metrics, state.hitchStyle, state.showTowTruck);
    if (geometryChanged && !poseOnly || changed('showTowTruck') || changed('cameraPreset')) {
      this.setCameraPreset(state.cameraPreset, undefined, false, !previous);
    }
    const center = this.getBounds().getCenter(new THREE.Vector3());
    this.dirLight.target.position.copy(center);
    this.dirLight.position.copy(center).add(new THREE.Vector3(-5, 12, 8));
    this.dirLight.target.updateMatrixWorld();
    if (geometryChanged || changed('showTowTruck')) this.markShadowsDirty();
    this.requestRender();
  }

  getBounds(preset) {
    this.scene.updateMatrixWorld(true);
    let bounds = new THREE.Box3().setFromObject(this.activeTrailer.rootGroup);
    if (this.state.showTowTruck) bounds.expandByObject(this.towTruck.group);
    if (preset === 'hitch') {
      bounds = new THREE.Box3().setFromObject(this.activeTrailer.hitchGroup);
      bounds.expandByScalar(.3);
    } else if (preset === 'ramps') {
      const rear = this.metrics.bedLengthM;
      bounds.min.x = rear - .55;
      bounds.max.x = Math.max(rear + .4, bounds.max.x);
      if (this.state.trailerType === 'dump') bounds.max.y = Math.min(bounds.max.y, this.metrics.deckHeightM + 1.2);
    } else if (this.state.showDimensions) bounds.expandByScalar(.4);
    return bounds;
  }
  refreshDimensions() {
    if (!this.activeTrailer) return;
    this.activeTrailer.rootGroup.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(this.activeTrailer.rootGroup);
    this.dimensionOverlay.update(this.metrics, this.state.showDimensions, this.state, bounds);
    const label = document.getElementById('measurement-summary');
    if (label) {
      const v = measurementValues(this.metrics, bounds), units = this.state.measurementUnits;
      label.textContent = `Overall span in this pose: ${formatDistance(v.overallLength, units)} · Hitch to axle group: ${formatDistance(v.hitchToAxle, units)}${this.state.trailerType === 'cargo' ? ` · Door opening: ${formatDistance(v.doorWidth, units, true)} × ${formatDistance(v.doorHeight, units, true)}` : ''}`;
    }
  }

  setCameraPreset(preset, _metrics, _truck, instant = false) {
    if (!this.activeTrailer) return;
    this.cameraController.frame(this.getBounds(preset), preset, instant);
    this.requestRender();
  }
  fitView() {
    if (!this.activeTrailer) return;
    this.cameraController.frame(this.getBounds(), this.state.cameraPreset, false, true);
  }
  refreshTruck(fit = true) {
    this.towTruck.updatePosition(this.metrics, this.state.hitchStyle, this.state.showTowTruck);
    this.markShadowsDirty();
    if (fit) this.fitView();
    this.requestRender();
  }

  handleResize(fit = true) {
    const { width, height } = this.container.getBoundingClientRect();
    if (!width || !height) return;
    this.width = width; this.height = height;
    this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    if (fit && this.activeTrailer) this.cameraController.frame(this.getBounds(), this.state.cameraPreset, true, true);
    this.requestRender();
  }

  requestRender() {
    if (this.running && !this.frame && !document.hidden && !this.contextLost) this.frame = requestAnimationFrame(this.render);
  }
  render(time) {
    this.frame = 0;
    if (!this.running || document.hidden || this.contextLost) return;
    const delta = this.lastFrameTime ? Math.min(.05, (time - this.lastFrameTime) / 1000) : 1 / 60;
    this.lastFrameTime = time;
    if (this.motion) {
      this.motion.elapsed += delta;
      const t = Math.min(1, this.motion.elapsed / .65);
      this.activeTrailer.setPose(THREE.MathUtils.lerp(this.motion.from, this.motion.to, t * t * (3 - 2 * t)));
      this.markShadowsDirty();
      if (t === 1) { this.motion = null; this.refreshDimensions(); }
    }
    const moving = this.cameraController.update(delta);
    this.dimensionOverlay.updateScale(this.camera, this.height);
    this.partInspector.update();
    this.renderer.render(this.scene, this.camera);
    if (moving || this.motion) this.requestRender();
    else this.lastFrameTime = 0;
  }
  finishMotion() {
    if (!this.motion) return;
    this.activeTrailer.setPose(this.motion.to); this.motion = null;
    this.markShadowsDirty(); this.requestRender();
  }
  async createSnapshot() {
    this.finishMotion();
    this.cameraController.update(1);
    this.dimensionOverlay.updateScale(this.camera, this.height);
    this.renderer.render(this.scene, this.camera);
    return new Promise((resolve, reject) => this.canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('The image could not be saved.')), 'image/png'));
  }
  async createThumbnail() {
    const image = await createImageBitmap(await this.createSnapshot());
    const canvas = document.createElement('canvas'); canvas.width = 180; canvas.height = 110;
    const context = canvas.getContext('2d'); context.fillStyle = '#e4e7eb'; context.fillRect(0, 0, 180, 110);
    const ratio = Math.min(180 / image.width, 110 / image.height);
    context.drawImage(image, (180 - image.width * ratio) / 2, (110 - image.height * ratio) / 2, image.width * ratio, image.height * ratio);
    image.close(); return canvas.toDataURL('image/jpeg', .7);
  }

  dispose() {
    this.running = false; cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect(); this.events.abort();
    this.activeTrailer?.dispose(); this.towTruck.dispose();
    this.cameraController.dispose(); this.dimensionOverlay.dispose();
    this.partInspector.dispose();
    this.environmentTarget.dispose();
    const geometries = new Set(), materials = new Set();
    this.scene.traverse(child => {
      if (child.geometry) geometries.add(child.geometry);
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) if (material) materials.add(material);
    });
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
    this.materials.dispose(); decalFactory.dispose(); this.renderer.dispose();
  }
}
