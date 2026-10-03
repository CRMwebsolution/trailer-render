import * as THREE from 'three';

export const PART_INFO = {
  frame: { title: 'Frame & crossmembers', description: 'The perimeter beams and crossmembers support the deck. Changing length, width, or weight class rebuilds this assembly.', control: 'group-size-controls' },
  wheels: { title: 'Wheels, axles & fenders', description: 'The axle group, tires, suspension and fenders are modeled together. Weight class changes the axle count and wheel arrangement.', control: 'group-axle-controls' },
  deck: { title: 'Deck & body', description: 'The load surface and trailer body. Flatbed decking, enclosed doors and dump-bed tilt have separate controls.', control: 'group-deck-controls' },
  hitch: { title: 'Hitch & tongue', description: 'The coupler and tongue connect the trailer to the tow vehicle. Their appearance does not establish vehicle compatibility.', control: 'group-hitch-controls' },
  jack: { title: 'Tongue jack', description: 'The telescoping leg supports the unhitched tongue. Use the extension slider to inspect its movement.', control: 'jack-settings' },
  ramps: { title: 'Loading ramps', description: 'These ramps are modeled in their current deployment position. Ramp length and deck height determine the displayed approach angle.', control: 'group-ramp-controls' },
  lighting: { title: 'Lights & accessories', description: 'Rear lights, marker lights and accessories help identify the modeled equipment. Their placement is illustrative.', control: 'group-signage-controls' }
};

export class PartInspector {
  constructor(scene, canvas, getRoot, onSelect) {
    this.scene = scene; this.canvas = canvas; this.getRoot = getRoot; this.onSelect = onSelect;
    this.raycaster = new THREE.Raycaster(); this.pointer = new THREE.Vector2();
    this.events = new AbortController();
    canvas.addEventListener('pointerdown', event => { this.start = { x: event.clientX, y: event.clientY, id: event.pointerId }; }, { signal: this.events.signal });
    canvas.addEventListener('pointerup', event => {
      if (!this.enabled || !this.start || event.pointerId !== this.start.id || Math.hypot(event.clientX - this.start.x, event.clientY - this.start.y) > 7) return;
      const rectangle = canvas.getBoundingClientRect();
      this.pointer.set((event.clientX - rectangle.left) / rectangle.width * 2 - 1, -(event.clientY - rectangle.top) / rectangle.height * 2 + 1);
      this.pick(this.pointer);
    }, { signal: this.events.signal });
  }
  setCamera(camera) { this.camera = camera; }
  setEnabled(enabled) { this.enabled = enabled; this.canvas.classList.toggle('inspect-mode', enabled); if (!enabled) this.clear(); }
  pick(pointer) {
    const root = this.getRoot(); if (!root) return;
    root.updateMatrixWorld(true); this.raycaster.setFromCamera(pointer, this.camera);
    const hit = this.raycaster.intersectObject(root, true).find(item => {
      if (!item.object.isMesh) return false;
      for (let object = item.object; object; object = object.parent) if (!object.visible) return false;
      return true;
    });
    let object = hit?.object;
    while (object && object !== root && !object.userData.partId) object = object.parent;
    if (object?.userData.partId) this.select(object); else this.clear();
  }
  selectById(id) {
    let found; this.getRoot()?.traverse(object => { if (!found && object.userData.partId === id) found = object; });
    if (found) this.select(found); else this.clear();
  }
  select(object) {
    this.clear(false); this.selected = object;
    this.highlight = new THREE.BoxHelper(object, '#e7a133');
    this.highlight.material.depthTest = false; this.highlight.material.transparent = true; this.highlight.material.opacity = .8;
    this.highlight.renderOrder = 5; this.scene.add(this.highlight);
    this.onSelect({ id: object.userData.partId, ...PART_INFO[object.userData.partId] });
  }
  update() { this.highlight?.update(); }
  clear(notify = true) {
    if (this.highlight) { this.scene.remove(this.highlight); this.highlight.geometry.dispose(); this.highlight.material.dispose(); }
    this.highlight = null; this.selected = null; if (notify) this.onSelect(null);
  }
  dispose() { this.events.abort(); this.clear(); }
}
