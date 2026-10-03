import * as THREE from 'three';

export class DimensionOverlay {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'Dimension_Overlay';
    this.scene.add(this.group);
    this.labels = [];
    this.lineMaterial = new THREE.LineBasicMaterial({ color: 0xb17825, depthTest: false, transparent: true, opacity: .85 });
  }
  update(metrics, visible = true) {
    this.clear(); this.group.visible = visible;
    if (!visible) return;
    const m = metrics;
    const z = m.bedWidthM / 2 + .55;
    this.line(new THREE.Vector3(0, .04, z), new THREE.Vector3(m.bedLengthM, .04, z), `${m.bedLengthFt} ft`, new THREE.Vector3(m.bedLengthM / 2, .12, z + .18));
    this.line(new THREE.Vector3(m.bedLengthM + .12, .04, -m.bedWidthM / 2), new THREE.Vector3(m.bedLengthM + .12, .04, m.bedWidthM / 2), `${m.bedWidthIn} in`, new THREE.Vector3(m.bedLengthM + .35, .12, 0));
    const axleX = m.axleCentroidFromFrontM;
    this.line(new THREE.Vector3(axleX, .04, z), new THREE.Vector3(axleX, m.deckHeightM + .25, z), `Axles · ${m.axleCentroidFromFrontFt.toFixed(1)} ft`, new THREE.Vector3(axleX, m.deckHeightM + .4, z));
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
