import { store } from '../core/StateStore.js';
import { configurationURL, normalizeConfig, DEFAULT_CONFIG } from '../core/config.js';
import { gltfExporterService } from '../export/GLTFExporterService.js';
import { designLibrary, STARTER_PRESETS } from '../core/DesignLibrary.js';

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
    this.renderDesignLibrary();
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
    store.update(next, { historyGroup: this.historyGroup });
  }
  update(values) { this.flush(); store.update(values); }

  bindEvents() {
    for (const preset of STARTER_PRESETS) {
      const option = document.createElement('option'); option.value = preset.id; option.textContent = preset.name;
      $('select-starter-preset').appendChild(option);
    }
    this.listen($('select-starter-preset'), 'change', event => {
      const preset = STARTER_PRESETS.find(item => item.id === event.target.value);
      if (preset) { this.flush(); store.replace(normalizeConfig(preset.config)); this.showToast(`${preset.name} loaded. Dimensions are modeled examples.`); }
      event.target.value = '';
    });
    this.click('btn-save-local', () => { $('design-name').value = `${store.getState().bedLengthFt} ft ${store.getState().trailerType}`; $('design-name-dialog').showModal(); $('design-name').focus(); });
    this.listen($('design-name-form'), 'submit', async event => {
      event.preventDefault(); this.flush();
      const button = $('btn-confirm-save-local'); button.disabled = true;
      try {
        let thumbnail = '';
        try { thumbnail = await this.sceneManager.createThumbnail(); } catch { /* A design is still useful without a thumbnail. */ }
        designLibrary.save($('design-name').value, store.getState(), thumbnail);
        $('design-name-dialog').close(); this.renderDesignLibrary(); this.showToast('Named design saved on this browser.');
      } catch (error) { this.showToast(error.message); }
      finally { button.disabled = false; }
    });
    this.click('btn-cancel-save-local', () => $('design-name-dialog').close());
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
      if (isInput) {
        this.listen(element, 'focus', () => { this.historyGroup = Symbol('edit'); });
        this.listen(element, 'pointerdown', () => { this.flush(); this.historyGroup = Symbol('drag'); });
        this.listen(element, 'pointerup', () => { this.flush(); this.historyGroup = null; });
        this.listen(element, 'blur', () => { this.flush(); this.historyGroup = null; });
      }
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
    this.click('btn-undo', () => store.undo());
    this.click('btn-redo', () => store.redo());
    this.click('btn-reset-design', () => { store.replace(DEFAULT_CONFIG); this.showToast('Default design restored. Undo brings your design back.'); });
    this.listen(document, 'keydown', event => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable || document.querySelector('dialog[open]')) return;
      const key = event.key.toLowerCase();
      if (key !== 'z' && key !== 'y') return;
      event.preventDefault(); this.flush();
      if (key === 'y' || event.shiftKey) store.redo(); else store.undo();
    });
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
    try { designLibrary.saveRecovery(state); $('autosave-status').textContent = 'Last design saved on this browser'; }
    catch { $('autosave-status').textContent = 'Use Save design to keep a JSON copy'; }
    const history = store.getHistory();
    $('btn-undo').disabled = !history.canUndo;
    $('btn-redo').disabled = !history.canRedo;
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
  renderDesignLibrary() {
    const root = $('saved-design-list'); root.replaceChildren();
    const designs = designLibrary.list();
    $('saved-design-empty').hidden = designs.length > 0;
    for (const design of designs) {
      const row = document.createElement('div'); row.className = 'saved-design';
      const load = document.createElement('button'); load.className = 'saved-design-load';
      if (design.thumbnail) { const img = document.createElement('img'); img.src = design.thumbnail; img.alt = ''; img.width = 90; img.height = 55; load.appendChild(img); }
      const label = document.createElement('span'); label.textContent = design.name; load.appendChild(label);
      this.listen(load, 'click', () => { this.flush(); store.replace(design.config); this.showToast(`${design.name} restored.`); });
      const remove = document.createElement('button'); remove.className = 'text-btn'; remove.textContent = 'Remove'; remove.setAttribute('aria-label', `Remove saved design ${design.name}`);
      this.listen(remove, 'click', () => {
        try { designLibrary.remove(design.id); this.renderDesignLibrary(); this.showToast('Saved copy removed. The current design stays in the viewer.'); }
        catch (error) { this.showToast(error.message); }
      });
      row.append(load, remove); root.appendChild(row);
    }
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
