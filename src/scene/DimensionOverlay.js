/**
 * DimensionOverlay.js
 * Renders dynamic 3D dimension leader lines and engineering markers.
 */
import * as THREE from 'three';

export class DimensionOverlay {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'Dimension_Overlay';
    this.scene.add(this.group);

    this.visible = true;
    this.lineMaterial = new THREE.LineBasicMaterial({
      color: 0xf59e0b, // Amber accent
      linewidth: 2,
      depthTest: false,
      transparent: true,
      opacity: 0.85
    });

    this.markerMaterial = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      depthTest: false,
      transparent: true,
      opacity: 0.85
    });
  }

  update(metrics, isVisible = true) {
    this.clear();
    this.visible = isVisible;
    this.group.visible = isVisible;

    if (!isVisible || !metrics) return;

    const {
      bedLengthM,
      bedWidthM,
      deckHeightM,
      axleCentroidFromFrontM,
      couplerHeightIn,
      hitchStyle
    } = metrics;

    const zOffset = bedWidthM / 2 + 0.35; // Position outside the trailer

    // 1. Bed Length Dimension Line
    this.createDimensionLine(
      new THREE.Vector3(0, 0.05, zOffset),
      new THREE.Vector3(bedLengthM, 0.05, zOffset),
      `Bed: ${metrics.bedLengthFt}ft (${(bedLengthM).toFixed(2)}m)`
    );

    // 2. Axle Centroid 60% Marker
    this.createAxleMarker(axleCentroidFromFrontM, deckHeightM, zOffset);

    // 3. Coupler Height Marker
    const couplerY = (couplerHeightIn || 19) * 0.0254;
    const couplerX = hitchStyle === 'bumper_pull' ? -1.45 : -2.09;
    this.createDimensionLine(
      new THREE.Vector3(couplerX, 0.0, 0),
      new THREE.Vector3(couplerX, couplerY, 0),
      `Hitch: ${couplerHeightIn}"`
    );
  }

  createDimensionLine(p1, p2) {
    const points = [p1, p2];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geo, this.lineMaterial);
    line.renderOrder = 999;
    this.group.add(line);

    // End tick marks
    [-1, 1].forEach(side => {
      const p = side === -1 ? p1 : p2;
      const tickPoints = [
        new THREE.Vector3(p.x, p.y - 0.06, p.z),
        new THREE.Vector3(p.x, p.y + 0.06, p.z)
      ];
      const tickGeo = new THREE.BufferGeometry().setFromPoints(tickPoints);
      const tickLine = new THREE.Line(tickGeo, this.lineMaterial);
      tickLine.renderOrder = 999;
      this.group.add(tickLine);
    });
  }

  createAxleMarker(axleX, deckY, zOffset) {
    // Vertical dotted line at axle 60/40 center
    const points = [
      new THREE.Vector3(axleX, 0, zOffset),
      new THREE.Vector3(axleX, deckY + 0.15, zOffset)
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geo, this.lineMaterial);
    line.renderOrder = 999;
    this.group.add(line);

    // Triangular marker pointing down
    const coneGeo = new THREE.ConeGeometry(0.06, 0.12, 12);
    coneGeo.rotateX(Math.PI);
    const cone = new THREE.Mesh(coneGeo, this.markerMaterial);
    cone.position.set(axleX, deckY + 0.22, zOffset);
    cone.renderOrder = 999;
    this.group.add(cone);
  }

  clear() {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child.geometry) child.geometry.dispose();
    }
  }

  dispose() {
    this.clear();
    this.scene.remove(this.group);
    this.lineMaterial.dispose();
    this.markerMaterial.dispose();
  }
}
