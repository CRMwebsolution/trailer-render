import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Fit all eight corners to the actual viewport, including narrow portrait screens.
export function frameBounds(bounds, aspect, fov, direction, padding = 1.16) {
  const target = bounds.getCenter(new THREE.Vector3());
  const forward = direction.clone().normalize();
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
  const up = new THREE.Vector3().crossVectors(forward, right).normalize();
  const tanV = Math.tan(THREE.MathUtils.degToRad(fov / 2));
  const tanH = tanV * Math.max(aspect, 0.1);
  let distance = 1;
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        const point = new THREE.Vector3(x, y, z).sub(target);
        const depth = point.dot(forward);
        distance = Math.max(distance, depth + Math.abs(point.dot(up)) * padding / tanV,
          depth + Math.abs(point.dot(right)) * padding / tanH);
      }
    }
  }
  return { target, position: target.clone().addScaledVector(forward, distance + 0.2) };
}

export class CameraController {
  constructor(camera, element, onChange) {
    this.camera = camera;
    this.controls = new OrbitControls(camera, element);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.minDistance = 0.7;
    this.controls.maxDistance = 100;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.01;
    this.controls.listenToKeyEvents(element);
    this.controls.addEventListener('change', onChange);
    this.controls.addEventListener('start', () => { this.isTransitioning = false; onChange(); });
    this.targetCameraPos = new THREE.Vector3();
    this.targetLookAt = new THREE.Vector3();
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.isTransitioning = false;
    this.onChange = onChange;
  }
  frame(bounds, preset = 'isometric', instant = false, keepDirection = false) {
    const directions = {
      isometric: new THREE.Vector3(-1.2, 0.85, 1.5),
      side: new THREE.Vector3(0, 0.08, 1),
      top: new THREE.Vector3(0, 1, 0.001),
      hitch: new THREE.Vector3(-1, 0.65, 1.4),
      ramps: new THREE.Vector3(1.5, 0.6, 1)
    };
    const direction = keepDirection ? this.camera.position.clone().sub(this.controls.target) : directions[preset] || directions.isometric;
    const result = frameBounds(bounds, this.camera.aspect, this.camera.fov, direction);
    this.targetLookAt.copy(result.target);
    this.targetCameraPos.copy(result.position);
    this.camera.far = Math.max(120, result.position.distanceTo(result.target) * 4);
    this.camera.updateProjectionMatrix();
    this.controls.minDistance = Math.max(0.5, bounds.getSize(new THREE.Vector3()).length() * 0.045);
    if (instant || this.reducedMotion.matches) {
      this.camera.position.copy(result.position);
      this.controls.target.copy(result.target);
      this.isTransitioning = false;
      this.controls.update();
    } else { this.isTransitioning = true; }
    this.onChange();
  }
  update(delta = 1 / 60) {
    if (this.isTransitioning) {
      const alpha = 1 - Math.exp(-9 * delta);
      this.camera.position.lerp(this.targetCameraPos, alpha);
      this.controls.target.lerp(this.targetLookAt, alpha);
      if (this.camera.position.distanceTo(this.targetCameraPos) < .005 && this.controls.target.distanceTo(this.targetLookAt) < .005) {
        this.camera.position.copy(this.targetCameraPos);
        this.controls.target.copy(this.targetLookAt);
        this.isTransitioning = false;
      }
    }
    return this.controls.update(delta) || this.isTransitioning;
  }
  dispose() { this.controls.dispose(); }
}
