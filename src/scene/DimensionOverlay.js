import * as THREE from 'three';
import { formatDistance, measurementValues } from '../core/modelGeometry.js';

export class DimensionOverlay {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'Dimension_Overlay';
    this.scene.add(this.group);
    this.labels = [];
    this.lineMaterial = new THREE.LineBasicMaterial({ color: 0xb17825, depthTest: false, transparent: true, opacity: .85 });
  }
  update(metrics, visible = true, state = {}, bounds) {
    this.clear(); this.group.visible = visible;
    if (!visible) return;
    const m = metrics;
    const values = measurementValues(m, bounds);
    const mode = state.measurementMode || 'deck';
    const include = group => mode === group || mode === 'all';
    const format = (value, short) => formatDistance(value, state.measurementUnits, short);
    const z = m.bedWidthM / 2 + .55;
    if (include('deck')) {
      this.line(new THREE.Vector3(0, .04, z), new THREE.Vector3(m.bedLengthM, .04, z), format(values.deckLength), new THREE.Vector3(m.bedLengthM / 2, .12, z + .18));
      this.line(new THREE.Vector3(m.bedLengthM + .12, .04, -m.bedWidthM / 2), new THREE.Vector3(m.bedLengthM + .12, .04, m.bedWidthM / 2), format(values.deckWidth, true), new THREE.Vector3(m.bedLengthM + .35, .12, 0));
      this.line(new THREE.Vector3(0, 0, -z), new THREE.Vector3(0, m.deckHeightM, -z), `Deck · ${format(values.deckHeight, true)}`, new THREE.Vector3(0, m.deckHeightM / 2, -z));
    }
    if (include('hitch')) {
      const axleX = m.axleCentroidFromFrontM;
      this.line(new THREE.Vector3(values.hitchX, .07, z + .2), new THREE.Vector3(axleX, .07, z + .2), `Hitch → axles · ${format(values.hitchToAxle)}`, new THREE.Vector3((values.hitchX + axleX) / 2, .35, z + .2));
    }
    if (include('overall') && bounds) {
      this.line(new THREE.Vector3(bounds.min.x, .05, -z - .2), new THREE.Vector3(bounds.max.x, .05, -z - .2), `Overall · ${format(values.overallLength)}`, new THREE.Vector3((bounds.min.x + bounds.max.x) / 2, .25, -z - .2));
    }
    if (include('interior') && m.trailerType === 'cargo') {
      const x = m.bedLengthM + .2;
      this.line(new THREE.Vector3(x, m.deckHeightM + .08, -values.doorWidth / 2), new THREE.Vector3(x, m.deckHeightM + .08, values.doorWidth / 2), `Opening · ${format(values.doorWidth, true)}`, new THREE.Vector3(x + .2, m.deckHeightM + .1, 0));
      this.line(new THREE.Vector3(x, m.deckHeightM + .04, values.doorWidth / 2), new THREE.Vector3(x, m.deckHeightM + .04 + values.doorHeight, values.doorWidth / 2), `Height · ${format(values.doorHeight, true)}`, new THREE.Vector3(x + .15, m.deckHeightM + values.doorHeight / 2, values.doorWidth / 2));
    }
  }
  line(from, to, text, labelPosition) {
    if (![...from.toArray(), ...to.toArray()].every(Number.isFinite)) return;
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, to]), this.lineMaterial);
    line.renderOrder = 5;
    this.group.add(line);
    for (const p of [from, to]) {
      const tick = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        p.clone().add(new THREE.Vector3(0, -.055, 0)), p.clone().add(new THREE.Vector3(0, .055, 0))
      ]), this.lineMaterial);
      tick.renderOrder = 5; this.group.add(tick);
    }
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = '600 24px sans-serif';
    canvas.width = Math.ceil(ctx.measureText(text).width + 30);
    canvas.height = 46;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.roundRect(0, 0, canvas.width, canvas.height, 10); ctx.fill();
    ctx.font = '600 24px sans-serif'; ctx.fillStyle = '#f8d394';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false, toneMapped: false });
    const label = new THREE.Sprite(material);
    label.position.copy(labelPosition); label.renderOrder = 6;
    label.userData.aspect = canvas.width / canvas.height;
    this.labels.push(label); this.group.add(label);
  }
  updateScale(camera, viewportHeight) {
    const occupied = [];
    const viewportWidth = viewportHeight * camera.aspect;
    for (const label of this.labels) {
      const distance = camera.position.distanceTo(label.position);
      const height = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance * 21 / Math.max(1, viewportHeight);
      label.scale.set(height * label.userData.aspect, height, 1);
      const point = label.position.clone().project(camera);
      const x = (point.x + 1) * viewportWidth / 2;
      const y = (1 - point.y) * viewportHeight / 2;
      const halfWidth = 21 * label.userData.aspect / 2;
      const rectangle = { left: x - halfWidth - 3, right: x + halfWidth + 3, top: y - 13, bottom: y + 13 };
      label.visible = Math.abs(point.x) < 1 && Math.abs(point.y) < 1 && !occupied.some(other =>
        rectangle.left < other.right && rectangle.right > other.left && rectangle.top < other.bottom && rectangle.bottom > other.top);
      if (label.visible) occupied.push(rectangle);
    }
  }
  clear() {
    for (const label of this.labels) { label.material.map.dispose(); label.material.dispose(); }
    this.labels = [];
    this.group.traverse(child => child.geometry?.dispose());
    this.group.clear();
  }
  dispose() { this.clear(); this.lineMaterial.dispose(); this.scene.remove(this.group); }
}
