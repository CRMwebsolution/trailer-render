import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { frameBounds } from '../scene/CameraController.js';

test('portrait and landscape cameras contain every corner of a raised dump model', () => {
  const bounds = new THREE.Box3(new THREE.Vector3(-1.5, 0, -1.5), new THREE.Vector3(6.1, 5.5, 1.5));
  for (const aspect of [.45, .8, 1.5, 3]) {
    for (const direction of [new THREE.Vector3(-1.2, .85, 1.5), new THREE.Vector3(0, 1, .001), new THREE.Vector3(0, .08, 1)]) {
      const { target, position } = frameBounds(bounds, aspect, 42, direction);
      const camera = new THREE.PerspectiveCamera(42, aspect, .05, 200);
      camera.position.copy(position); camera.lookAt(target); camera.updateMatrixWorld();
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
        const screen = new THREE.Vector3(x, y, z).project(camera);
        assert(Math.abs(screen.x) <= 1 && Math.abs(screen.y) <= 1 && Math.abs(screen.z) <= 1);
      }
    }
  }
});
