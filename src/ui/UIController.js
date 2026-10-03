import { store } from '../core/StateStore.js';
import { configurationURL, normalizeConfig } from '../core/config.js';
import { gltfExporterService } from '../export/GLTFExporterService.js';

const FIELDS = {
  'select-trailer-type': 'trailerType', 'slider-bed-length': 'bedLengthFt',
  'select-trailer-width': 'trailerWidthIn', 'select-payload-class': 'payloadClass',
  'slider-ramp-length': 'rampLengthFt', 'check-cargo-side-door': 'cargoSideDoor',
  'input-decal-text': 'decalText', 'select-render-quality': 'renderQuality'
};
const RADIOS = {
  'fender-style': 'fenderStyle', 'hitch-style': 'hitchStyle', 'deck-mat': 'deckMaterial',
  'ramp-style': 'rampStyle', 'ramp-pos': 'rampPosition', 'dump-bed-pos': 'dumpBedPosition',
  'dump-door-style': 'dumpDoorStyle', 'cargo-rear-door': 'cargoRearDoor', 'cargo-door-pos': 'cargoDoorPosition'
};
const $ = id => document.getElementById(id);

export class UIController {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.pending = {};
    this.abort = new AbortController();
    this.bindEvents();
    this.unsubscribe = store.subscribe(state => this.syncFromState(state));
  }
  listen(element, event, callback) {
    element?.addEventListener(event, callback, { signal: this.abort.signal });
  }
  click(id, callback) {
    this.listen($(id), 'click', async () => {
      this.flush();
      try { await callback(); } catch (error) { this.showToast(error.message || 'That action could not be completed.'); }
    });
  }
  queue(values, delay = 0) {
    Object.assign(this.pending, values);
    clearTimeout(this.inputTimer);
    this.inputTimer = setTimeout(() => this.flush(), delay);
  }
  flush() {
    clearTimeout(this.inputTimer);
    if (!Object.keys(this.pending).length) return;
    const next = this.pending;
    this.pending = {};
    store.update(next);
  }
  update(values) { this.flush(); store.update(values); }

  bindEvents() {
    for (const [id, key] of Object.entries(FIELDS)) {
      const element = $(id);
      const isInput = element.type === 'range' || element.type === 'text';
      this.listen(element, isInput ? 'input' : 'change', () => {
        let value = element.type === 'checkbox' ? element.checked : element.value;
        if (['bedLengthFt', 'rampLengthFt', 'trailerWidthIn'].includes(key)) value = Number(value);
        const update = { [key]: value };
        if (key === 'trailerWidthIn') update.fenderStyle = value === 102 ? 'deck_over' : 'regular';
        if (isInput) this.queue(update, element.type === 'text' ? 180 : 16);
        else this.update(update);
        if (id === 'slider-bed-length') $('val-bed-length').textContent = `${value} ft`;
        if (id === 'slider-ramp-length') $('val-ramp-length').textContent = `${value.toFixed(1)} ft`;
      });
      if (isInput) this.listen(element, 'change', () => this.flush());
    }
    for (const [name, key] of Object.entries(RADIOS)) {
      document.querySelectorAll(`input[name="${name}"]`).forEach(input => {
        this.listen(input, 'change', () => { if (input.checked) this.update({ [key]: input.value }); });
      });
    }
    document.querySelectorAll('[data-color]').forEach(button => this.listen(button, 'click', () => this.update({ finishColor: button.dataset.color })));
    document.querySelectorAll('[data-decal-color]').forEach(button => this.listen(button, 'click', () => this.update({ decalColor: button.dataset.decalColor })));
    document.querySelectorAll('[data-env]').forEach(button => this.listen(button, 'click', () => this.update({ environmentMode: button.dataset.env })));
    document.querySelectorAll('[data-preset]').forEach(button => this.listen(button, 'click', () => {
      this.update({ cameraPreset: button.dataset.preset });
      this.sceneManager.setCameraPreset(button.dataset.preset);
    }));
    document.querySelectorAll('[data-panel]').forEach(button => this.listen(button, 'click', () => {
      $('app').dataset.mobilePanel = button.dataset.panel;
      document.querySelectorAll('[data-panel]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    }));
    this.click('btn-fit-view', () => this.sceneManager.fitView());
    this.click('btn-toggle-dimensions', () => this.update({ showDimensions: !store.getState().showDimensions }));
    this.click('btn-toggle-truck', () => this.update({ showTowTruck: !store.getState().showTowTruck }));
    this.click('btn-load-truck', () => $('input-truck-file').click());
    this.listen($('input-truck-file'), 'change', async event => {
      const file = event.target.files[0];
      event.target.value = '';
      if (!file) return;
      $('btn-load-truck').disabled = true;
      this.showToast('Loading truck model…');
      try {
        await this.sceneManager.towTruck.loadCustomTruck(file, file.name);
        this.update({ showTowTruck: true });
        this.refreshTruck();
        this.showToast('Truck loaded. Adjust its alignment under Tow vehicle & display.');
      } catch (error) { this.showToast(error.message || 'This model could not be loaded.'); }
      finally { $('btn-load-truck').disabled = false; }
    });
    this.click('btn-reset-truck', () => {
      this.sceneManager.towTruck.resetToProcedural();
      this.refreshTruck();
    });
    for (const id of ['truck-scale', 'truck-offset']) {
      this.listen($(id), 'input', () => {
        this.sceneManager.towTruck.adjustCustomModel({
          scale: Number($('truck-scale').value) / 100, offset: Number($('truck-offset').value)
        });
        $('val-truck-scale').textContent = `${$('truck-scale').value}%`;
        $('val-truck-offset').textContent = `${Number($('truck-offset').value).toFixed(2)} m`;
        this.sceneManager.refreshTruck(false);
      });
    }
    this.click('btn-flip-truck', () => {
      this.sceneManager.towTruck.adjustCustomModel({ flip: !this.sceneManager.towTruck.customFlip });
      this.sceneManager.refreshTruck();
    });
    this.click('btn-export-glb', async () => {
      const button = $('btn-export-glb');
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      try {
        this.sceneManager.finishMotion();
        const result = await gltfExporterService.exportGLB(this.sceneManager.activeTrailer.rootGroup, store.getState(), store.getMetrics());
        this.showToast(`Saved ${result.fileName}`);
      } finally { button.disabled = false; button.removeAttribute('aria-busy'); }
    });
    this.click('btn-snapshot', async () => {
      const blob = await this.sceneManager.createSnapshot();
      this.download(blob, `trailer-${store.getState().trailerType}.png`);
      this.showToast('Trailer image saved.');
    });
    this.click('btn-save-design', () => {
      const contents = JSON.stringify({ version: 1, config: store.getState() }, null, 2);
      this.download(new Blob([contents], { type: 'application/json' }), 'trailer-design.json');
      this.showToast('Design saved. Custom truck files are loaded separately.');
    });
    this.click('btn-load-design', () => $('input-design-file').click());
    this.listen($('input-design-file'), 'change', async event => {
      const file = event.target.files[0];
      event.target.value = '';
      if (!file) return;
      try {
        if (file.size > 32000) throw new Error('Choose a trailer design JSON file smaller than 32 KB.');
        const value = JSON.parse(await file.text());
        if (value.version !== 1 || !value.config || typeof value.config !== 'object' || Array.isArray(value.config)) {
          throw new Error('This file is not a supported trailer design.');
        }
        this.flush();
        store.replace(normalizeConfig(value.config));
        this.sceneManager.setCameraPreset(store.getState().cameraPreset);
        this.showToast('Design restored.');
      } catch (error) { this.showToast(error instanceof SyntaxError ? 'This file contains invalid JSON.' : error.message); }
    });
    this.click('btn-share-design', async () => {
      const url = configurationURL(store.getState(), window.location.href);
      try {
        await navigator.clipboard.writeText(url);
        this.showToast('Design address copied. Custom truck files are not included.');
      } catch {
        $('share-url').value = url;
        $('share-dialog').showModal();
        $('share-url').focus();
        $('share-url').select();
      }
    });
  }

  syncFromState(state) {
    for (const [id, key] of Object.entries(FIELDS)) {
      const element = $(id);
      if (element.type === 'checkbox') element.checked = state[key];
      else if (document.activeElement !== element || !Object.hasOwn(this.pending, key)) element.value = state[key];
    }
    for (const [name, key] of Object.entries(RADIOS)) {
      document.querySelectorAll(`input[name="${name}"]`).forEach(input => { input.checked = input.value === state[key]; });
    }
    $('val-bed-length').textContent = `${state.bedLengthFt} ft`;
    $('val-ramp-length').textContent = `${state.rampLengthFt.toFixed(1)} ft`;
    for (const [selector, field, data] of [['[data-color]', 'finishColor', 'color'], ['[data-decal-color]', 'decalColor', 'decalColor'], ['[data-env]', 'environmentMode', 'env'], ['[data-preset]', 'cameraPreset', 'preset']]) {
      document.querySelectorAll(selector).forEach(button => {
        const active = button.dataset[data] === state[field];
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
    }
    for (const [id, value] of [['btn-toggle-truck', state.showTowTruck], ['btn-toggle-dimensions', state.showDimensions]]) {
      $(id).classList.toggle('active', value);
      $(id).setAttribute('aria-pressed', String(value));
    }
    $('group-ramp-controls').style.display = state.trailerType === 'flatbed' ? 'flex' : 'none';
    $('group-dump-controls').style.display = state.trailerType === 'dump' ? 'flex' : 'none';
    $('group-cargo-controls').style.display = state.trailerType === 'cargo' ? 'flex' : 'none';
    $('group-hitch-controls').style.display = state.trailerType === 'cargo' ? 'none' : 'flex';
    $('group-fender-controls').style.display = state.trailerType === 'cargo' ? 'none' : 'flex';
    $('group-deck-controls').querySelector('.segmented-control').hidden = state.trailerType !== 'flatbed';
    $('group-deck-controls').querySelector('.section-title span').textContent = state.trailerType === 'flatbed' ? 'Deck & finish' : 'Body finish';
    $('group-ramp-length').style.display = state.rampStyle === 'slide_in' ? 'flex' : 'none';
    $('option-ramp-standing').style.display = state.rampStyle === 'fold_flat' ? 'block' : 'none';
    const dualWheels = ['20K', '25K'].includes(state.payloadClass);
    $('fender-regular').disabled = dualWheels;
    $('fender-driveover').disabled = dualWheels;
    $('select-trailer-width').disabled = dualWheels;
    $('configuration-note').hidden = !dualWheels;
    const names = { flatbed: 'Flatbed / equipment', dump: 'Hydraulic dump', cargo: 'Enclosed cargo' };
    $('model-title').textContent = names[state.trailerType];
    $('model-dimensions').textContent = `${state.bedLengthFt} ft × ${state.trailerWidthIn} in · ${state.payloadClass === 'single' ? 'Single axle' : state.payloadClass}`;
  }

  refreshTruck() {
    const custom = this.sceneManager.towTruck.isCustom;
    $('btn-reset-truck').hidden = !custom;
    $('custom-truck-controls').hidden = !custom;
    $('truck-btn-text').textContent = custom ? 'Custom truck' : 'Tow vehicle';
    $('truck-scale').value = '100'; $('truck-offset').value = '0';
    $('val-truck-scale').textContent = '100%'; $('val-truck-offset').textContent = '0.00 m';
    this.sceneManager.refreshTruck();
  }
  download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast'; toast.textContent = message;
    const container = $('toast-container');
    while (container.children.length > 2) container.firstElementChild.remove();
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4500);
  }
  dispose() { this.abort.abort(); clearTimeout(this.inputTimer); this.unsubscribe(); }
}
