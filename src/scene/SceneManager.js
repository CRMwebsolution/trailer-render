/**
 * SceneManager.js
 * High-performance Three.js WebGL scene orchestrator with soft contact shadows,
 * studio three-point lighting, procedural HDR reflections, background modes, and tow truck integration.
 */
import * as THREE from 'three';
import { CameraController } from './CameraController.js';
import { MaterialFactory } from './MaterialFactory.js';
import { DimensionOverlay } from './DimensionOverlay.js';
import { TowTruck } from './TowTruck.js';
import { trailerFactory } from '../trailers/TrailerFactory.js';

export class SceneManager {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.width = canvasElement.clientWidth || window.innerWidth;
    this.height = canvasElement.clientHeight || window.innerHeight;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0c0d10');
    this.scene.fog = new THREE.FogExp2('#0c0d10', 0.025);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(42, this.width / this.height, 0.1, 100);
    this.camera.position.set(-6.0, 4.5, 9.0);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // 4. Subsystems
    this.materials = new MaterialFactory();
    this.cameraController = new CameraController(this.camera, this.renderer.domElement);
    this.dimensionOverlay = new DimensionOverlay(this.scene);
    this.towTruck = new TowTruck(this.materials);
    this.scene.add(this.towTruck.group);

    // 5. Environment & Ground
    this.setupLighting();
    this.setupEnvironment();
    this.setupGround();
    this.setupShowroom();

    // 6. Active Trailer Instance
    this.activeTrailer = null;
    this.currentType = null;
    this.currentEnvMode = 'black';

    // 7. Event Handlers & RAF
    this.onResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.onResize);

    this.isRunning = true;
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupLighting() {
    // Ambient / Hemisphere Fill
    this.hemiLight = new THREE.HemisphereLight(0xe2e8f0, 0x18181b, 0.7);
    this.hemiLight.position.set(0, 20, 0);
    this.scene.add(this.hemiLight);

    // Main Studio Sun / Key Light with Soft Shadows
    this.dirLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    this.dirLight.position.set(12, 16, 10);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 1.0;
    this.dirLight.shadow.camera.far = 45;
    this.dirLight.shadow.camera.left = -16;
    this.dirLight.shadow.camera.right = 16;
    this.dirLight.shadow.camera.top = 10;
    this.dirLight.shadow.camera.bottom = -4;
    this.dirLight.shadow.bias = -0.0003;
    this.dirLight.shadow.radius = 2.5;
    this.scene.add(this.dirLight);

    // Soft Rim / Fill Light from back-left
    this.rimLight = new THREE.DirectionalLight(0x93c5fd, 0.9);
    this.rimLight.position.set(-14, 10, -12);
    this.scene.add(this.rimLight);

    // Secondary Underbody Fill
    this.underFill = new THREE.DirectionalLight(0xffffff, 0.4);
    this.underFill.position.set(0, -6, 4);
    this.scene.add(this.underFill);
  }

  setupEnvironment() {
    const pmremGen = new THREE.PMREMGenerator(this.renderer);
    pmremGen.compileEquirectangularShader();

    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color('#1e2229');

    const panelGeo = new THREE.PlaneGeometry(12, 8);
    const panelMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const topPanel = new THREE.Mesh(panelGeo, panelMat);
    topPanel.position.set(0, 10, 0);
    topPanel.rotation.x = Math.PI / 2;
    envScene.add(topPanel);

    const sidePanel = new THREE.Mesh(panelGeo, panelMat);
    sidePanel.position.set(10, 5, 5);
    sidePanel.rotation.y = -Math.PI / 3;
    envScene.add(sidePanel);

    const renderTarget = pmremGen.fromScene(envScene);
    this.scene.environment = renderTarget.texture;
    pmremGen.dispose();
  }

  setupGround() {
    // 1. Soft Shadow Receiver Plane
    const shadowPlaneGeo = new THREE.PlaneGeometry(80, 80);
    shadowPlaneGeo.rotateX(-Math.PI / 2);
    this.shadowMat = new THREE.ShadowMaterial({ opacity: 0.45 });
    this.shadowPlane = new THREE.Mesh(shadowPlaneGeo, this.shadowMat);
    this.shadowPlane.position.y = 0.0;
    this.shadowPlane.receiveShadow = true;
    this.scene.add(this.shadowPlane);

    // 2. Subtle Engineering Grid
    this.grid = new THREE.GridHelper(60, 60, 0xf59e0b, 0x27272a);
    this.grid.position.y = -0.001;
    this.scene.add(this.grid);
  }

  /**
   * Premium Automotive Showroom Environment:
   * Features a polished display turntable, overhead softbox light banks,
   * halo ring perimeter, and studio spotlights.
   */
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
    this.showroomGroup.add(centerBank);

    // Left and Right Angled Accent Softboxes
    const sideSoftboxGeo = new THREE.BoxGeometry(14, 0.15, 2.0);
    const leftBank = new THREE.Mesh(sideSoftboxGeo, softboxMaterials);
    leftBank.position.set(2.5, 7.8, 5.2);
    leftBank.rotation.x = -0.35;
    this.showroomGroup.add(leftBank);

    const rightBank = new THREE.Mesh(sideSoftboxGeo, softboxMaterials);
    rightBank.position.set(2.5, 7.8, -5.2);
    rightBank.rotation.x = 0.35;
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

  /**
   * Switches studio background & ground floor environment.
   * @param {string} mode - 'black' | 'white' | 'showroom'
   */
  setBackgroundMode(mode = 'black') {
    if (this.currentEnvMode === mode) return;
    this.currentEnvMode = mode;

    switch (mode) {
      case 'white':
        if (this.showroomGroup) this.showroomGroup.visible = false;
        this.scene.background.set('#f8fafc');
        this.scene.fog.color.set('#f8fafc');
        this.scene.fog.density = 0.015;
        this.shadowMat.opacity = 0.22;
        this.grid.visible = false;
        this.dirLight.intensity = 2.4;
        this.hemiLight.color.set(0xffffff);
        this.hemiLight.groundColor.set(0xd1d5db);
        break;

      case 'showroom':
        if (this.showroomGroup) this.showroomGroup.visible = true;
        this.scene.background.set('#141b26');
        this.scene.fog.color.set('#141b26');
        this.scene.fog.density = 0.014;
        this.shadowMat.opacity = 0.60;
        this.grid.visible = false;
        this.dirLight.intensity = 2.6;
        this.hemiLight.color.set(0xffedd5); // Warm overhead showroom tint
        this.hemiLight.groundColor.set(0x0f172a);
        break;

      case 'black':
      default:
        if (this.showroomGroup) this.showroomGroup.visible = false;
        this.scene.background.set('#0c0d10');
        this.scene.fog.color.set('#0c0d10');
        this.scene.fog.density = 0.025;
        this.shadowMat.opacity = 0.45;
        this.grid.visible = true;
        this.dirLight.intensity = 2.2;
        this.hemiLight.color.set(0xe2e8f0);
        this.hemiLight.groundColor.set(0x18181b);
        break;
    }
  }

  /**
   * Updates or switches the trailer model according to state and metrics.
   */
  updateTrailer(state, metrics) {
    const type = state.trailerType || 'flatbed';

    // Environment background update
    this.setBackgroundMode(state.environmentMode || 'black');

    // If trailer type changed or doesn't exist, instantiate new subclass
    if (!this.activeTrailer || this.currentType !== type) {
      if (this.activeTrailer) {
        this.activeTrailer.dispose();
      }
      this.activeTrailer = trailerFactory.create(type, this.scene, this.materials);
      this.currentType = type;
    }

    // Build the procedural geometry
    this.activeTrailer.build(state, metrics);

    // Update 3D Dimension Overlay
    this.dimensionOverlay.update(metrics, state.showDimensions);

    // Update Tow Truck Position and Visibility
    this.towTruck.updatePosition(metrics, state.hitchStyle, !!state.showTowTruck);

    // Adjust shadow frustum target position to trailer midpoint
    const midX = metrics.bedLengthM * 0.45;
    this.dirLight.target.position.set(midX, 0, 0);
    this.dirLight.target.updateMatrixWorld();
  }

  setCameraPreset(preset, metrics, showTowTruck = false, instant = false) {
    this.cameraController.setPreset(preset, metrics, showTowTruck, instant);
  }

  handleResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  animate() {
    if (!this.isRunning) return;
    requestAnimationFrame(this.animate);
    this.cameraController.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.isRunning = false;
    window.removeEventListener('resize', this.onResize);
    if (this.activeTrailer) this.activeTrailer.dispose();
    this.towTruck.dispose();
    this.materials.dispose();
    this.cameraController.dispose();
    this.dimensionOverlay.dispose();
    this.renderer.dispose();
  }
}
