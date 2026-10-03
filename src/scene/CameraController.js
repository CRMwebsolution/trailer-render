/**
 * CameraController.js
 * Controls viewport camera with smooth OrbitControls, auto-framing, and preset perspectives.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class CameraController {
  constructor(camera, domElement) {
    this.camera = camera;
    this.controls = new OrbitControls(camera, domElement);

    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.03; // Disallow below ground
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 40.0;

    // Default target
    this.controls.target.set(3.0, 0.8, 0);

    // Animation transition variables
    this.isTransitioning = false;
    this.targetCameraPos = new THREE.Vector3();
    this.targetLookAt = new THREE.Vector3();
    this.transitionSpeed = 0.08;
  }

  update() {
    if (this.isTransitioning) {
      this.camera.position.lerp(this.targetCameraPos, this.transitionSpeed);
      this.controls.target.lerp(this.targetLookAt, this.transitionSpeed);

      if (this.camera.position.distanceTo(this.targetCameraPos) < 0.05 &&
          this.controls.target.distanceTo(this.targetLookAt) < 0.05) {
        this.camera.position.copy(this.targetCameraPos);
        this.controls.target.copy(this.targetLookAt);
        this.isTransitioning = false;
      }
    }
    this.controls.update();
  }

  /**
   * Sets camera to predefined engineering viewpoints.
   * @param {string} preset - 'isometric' | 'side' | 'top' | 'hitch' | 'ramps'
   * @param {Object} metrics - Current trailer metrics
   */
  setPreset(preset, metrics, showTowTruck = false, instant = false) {
    let centerXM = metrics ? metrics.bedLengthM * 0.45 : 3.0;
    let bedLenM = metrics ? metrics.bedLengthM : 6.0;

    if (showTowTruck) {
      // Combined rig bounds: front bumper at ~ -7.5m, trailer rear at +bedLengthM
      centerXM = (bedLenM - 7.5) * 0.5;
      bedLenM = bedLenM + 7.5;
    }

    switch (preset) {
      case 'side':
        this.targetLookAt.set(centerXM, 0.9, 0);
        this.targetCameraPos.set(centerXM, 1.4, Math.max(9.0, bedLenM * 1.1));
        break;

      case 'top':
        this.targetLookAt.set(centerXM, 0, 0);
        this.targetCameraPos.set(centerXM, Math.max(10.0, bedLenM * 1.2), 0.01);
        break;

      case 'hitch':
        if (showTowTruck) {
          this.targetLookAt.set(-1.8, 1.0, 0);
          this.targetCameraPos.set(-4.5, 2.5, 4.0);
        } else {
          this.targetLookAt.set(-0.8, 0.8, 0);
          this.targetCameraPos.set(-2.8, 1.8, 2.4);
        }
        break;

      case 'ramps':
        const rearXM = metrics ? metrics.bedLengthM : 6.0;
        this.targetLookAt.set(rearXM + 0.5, 0.5, 0);
        this.targetCameraPos.set(rearXM + 3.2, 1.6, 2.5);
        break;

      case 'isometric':
      default:
        this.targetLookAt.set(centerXM, 0.7, 0);
        this.targetCameraPos.set(
          centerXM - (bedLenM * 0.4),
          Math.max(4.0, bedLenM * 0.38),
          Math.max(7.0, bedLenM * 0.65)
        );
        break;
    }

    if (instant) {
      this.camera.position.copy(this.targetCameraPos);
      this.controls.target.copy(this.targetLookAt);
      this.controls.update();
      this.isTransitioning = false;
    } else {
      this.isTransitioning = true;
    }
  }

  /**
   * Automatically frame trailer based on length change.
   */
  fitToTrailer(metrics) {
    if (!metrics) return;
    const centerXM = metrics.bedLengthM * 0.45;
    this.controls.target.set(centerXM, 0.7, 0);
  }

  dispose() {
    this.controls.dispose();
  }
}
