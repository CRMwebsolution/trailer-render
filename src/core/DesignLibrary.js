import { normalizeConfig } from './config.js';

export const STARTER_PRESETS = [
  { id: 'equipment', name: '20 ft equipment trailer', config: { bedLengthFt: 20, payloadClass: '14K', fenderStyle: 'drive_over', decalText: 'EQUIPMENT' } },
  { id: 'utility', name: '14 ft single-axle flatbed', config: { bedLengthFt: 14, trailerWidthIn: 76, payloadClass: 'single', rampPosition: 'stowed', decalText: 'UTILITY' } },
  { id: 'dump', name: '14 ft hydraulic dump', config: { trailerType: 'dump', bedLengthFt: 14, payloadClass: '14K', decalText: 'DUMP' } },
  { id: 'cargo', name: '20 ft enclosed cargo', config: { trailerType: 'cargo', bedLengthFt: 20, trailerWidthIn: 102, payloadClass: '10K', decalText: 'CARGO' } },
  { id: 'gooseneck', name: '25 ft deck-over gooseneck', config: { bedLengthFt: 25, trailerWidthIn: 102, payloadClass: '20K', hitchStyle: 'gooseneck', rampStyle: 'fold_flat', rampPosition: 'standing', decalText: 'DECK OVER' } }
];

export class DesignLibrary {
  constructor(storage) {
    try { this.storage = storage ?? globalThis.localStorage; } catch { this.storage = null; }
  }
  read(key, fallback) {
    try { return JSON.parse(this.storage?.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
  }
  write(key, value) {
    if (!this.storage) throw new Error('Browser storage is unavailable. Use Save design to keep a JSON copy.');
    try { this.storage.setItem(key, JSON.stringify(value)); }
    catch { throw new Error('Browser storage is full or blocked. Use Save design to keep a JSON copy.'); }
  }
  list() {
    const list = this.read('pro-trailer.designs.v1', []);
    if (!Array.isArray(list)) return [];
    return list.filter(item => item && typeof item.id === 'string' && typeof item.name === 'string' && item.config && typeof item.config === 'object')
      .slice(0, 12).map(item => ({ ...item, name: item.name.slice(0, 40), config: normalizeConfig(item.config),
        thumbnail: typeof item.thumbnail === 'string' && /^data:image\/(jpeg|png);base64,[a-z\d+/=]+$/i.test(item.thumbnail) && item.thumbnail.length < 80000 ? item.thumbnail : '' }));
  }
  save(name, config, thumbnail = '') {
    const list = this.list();
    if (list.length >= 12) throw new Error('Your browser can keep 12 designs. Remove one or export a JSON copy first.');
    const item = { id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`, name: name.trim().slice(0, 40) || 'Untitled trailer',
      config: normalizeConfig(config), thumbnail, savedAt: new Date().toISOString() };
    this.write('pro-trailer.designs.v1', [item, ...list]); return item;
  }
  remove(id) { this.write('pro-trailer.designs.v1', this.list().filter(item => item.id !== id)); }
  recover() {
    const config = this.read('pro-trailer.recovery.v1', null);
    return config && typeof config === 'object' && !Array.isArray(config) ? normalizeConfig(config) : null;
  }
  saveRecovery(config) { this.write('pro-trailer.recovery.v1', normalizeConfig(config)); }
}
export const designLibrary = new DesignLibrary();
