import * as THREE from 'three';
import { computeCargoFit } from '../core/cargoFit.js';

export class CargoEnvelope {
  constructor(scene) {
    this.group = new THREE.Group(); this.group.name = 'Cargo_Envelope_Overlay'; scene.add(this.group);
    this.fillMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: .14, depthWrite: false });
    this.lineMaterial = new THREE.LineBasicMaterial({ transparent: true, opacity: .95 });
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.fillMaterial);
    this.edges = new THREE.LineSegments(new THREE.EdgesGeometry(this.mesh.geometry), this.lineMaterial);
    this.mesh.add(this.edges); this.group.add(this.mesh); this.group.visible = false;
  }
  update(state, metrics, trailer) {
    this.fit = computeCargoFit(state, metrics); this.state = state; this.metrics = metrics; this.trailer = trailer;
    this.group.visible = this.fit.enabled;
    const color = this.fit.fits && this.fit.doorFits !== false ? '#34d399' : '#fb7185';
    this.fillMaterial.color.set(color); this.lineMaterial.color.set(color);
    this.mesh.scale.set(this.fit.length, this.fit.height, this.fit.width);
    this.mesh.rotation.y = this.fit.yaw; this.updatePose();
  }
  updatePose() {
    if (!this.fit?.enabled) return;
    const f = this.fit;
    if (this.state.trailerType === 'dump' && this.trailer.dumpBed) {
      this.group.position.copy(this.trailer.dumpBed.position); this.group.quaternion.copy(this.trailer.dumpBed.quaternion);
      this.mesh.position.set(f.centerX - this.metrics.bedLengthM, .14 + f.height / 2, f.centerZ);
    } else {
      this.group.position.set(0, 0, 0); this.group.quaternion.identity();
      this.mesh.position.set(f.centerX, this.metrics.deckHeightM + .02 + f.height / 2, f.centerZ);
    }
  }
  dispose() {
    this.group.removeFromParent(); this.mesh.geometry.dispose(); this.edges.geometry.dispose();
    this.fillMaterial.dispose(); this.lineMaterial.dispose();
  }
}
