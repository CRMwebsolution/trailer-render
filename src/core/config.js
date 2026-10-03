// Every entry point (controls, saved designs and shared URLs) uses these rules.
export const DEFAULT_CONFIG = Object.freeze({
  trailerType: 'flatbed', bedLengthFt: 20, trailerWidthIn: 83,
  fenderStyle: 'regular', payloadClass: '14K', hitchStyle: 'bumper_pull',
  deckMaterial: 'wood', finishColor: '#27272a',
  rampStyle: 'slide_in', rampLengthFt: 6, rampPosition: 'deployed',
  dumpBedPosition: 'lowered', dumpDoorStyle: 'barn',
  cargoRearDoor: 'ramp', cargoSideDoor: true, cargoDoorPosition: 'closed',
  decalText: 'TITAN 14K', decalColor: '#f59e0b',
  environmentMode: 'white', showTowTruck: false, showDimensions: true,
  cameraPreset: 'isometric', renderQuality: 'auto', measurementMode: 'deck', measurementUnits: 'imperial'
});

const ENUMS = {
  trailerType: ['flatbed', 'dump', 'cargo'],
  fenderStyle: ['regular', 'drive_over', 'deck_over'],
  payloadClass: ['single', '10K', '14K', '20K', '25K'],
  hitchStyle: ['bumper_pull', 'gooseneck'],
  deckMaterial: ['wood', 'diamond_plate'],
  rampStyle: ['slide_in', 'fold_flat'],
  rampPosition: ['stowed', 'deployed', 'standing'],
  dumpBedPosition: ['lowered', 'raised'], dumpDoorStyle: ['barn', 'spreader'],
  cargoRearDoor: ['ramp', 'barn'], cargoDoorPosition: ['closed', 'open'],
  environmentMode: ['black', 'white', 'showroom'],
  cameraPreset: ['isometric', 'side', 'top', 'hitch', 'ramps'],
  renderQuality: ['auto', 'high', 'low']
  , measurementMode: ['deck', 'overall', 'hitch', 'interior', 'all'], measurementUnits: ['imperial', 'metric']
};

function numberInRange(value, fallback, min, max, step = 1) {
  if (value === '' || value == null || !Number.isFinite(Number(value))) return fallback;
  return Math.round(Math.max(min, Math.min(max, Number(value))) / step) * step;
}

export function normalizeConfig(input = {}, changes = {}) {
  const state = { ...DEFAULT_CONFIG };
  if (!input || typeof input !== 'object' || Array.isArray(input)) return state;
  for (const [key, values] of Object.entries(ENUMS)) {
    if (values.includes(input[key])) state[key] = input[key];
  }
  state.bedLengthFt = numberInRange(input.bedLengthFt, 20, 10, 30);
  state.rampLengthFt = numberInRange(input.rampLengthFt, 6, 5, 8, 0.5);
  if ([76, 83, 96, 102].includes(Number(input.trailerWidthIn))) {
    state.trailerWidthIn = Number(input.trailerWidthIn);
  }
  for (const key of ['showTowTruck', 'showDimensions', 'cargoSideDoor']) {
    if (typeof input[key] === 'boolean') state[key] = input[key];
  }
  for (const key of ['finishColor', 'decalColor']) {
    if (typeof input[key] === 'string' && /^#[a-f\d]{6}$/i.test(input[key])) {
      state[key] = input[key].toLowerCase();
    }
  }
  if (typeof input.decalText === 'string') state.decalText = input.decalText.slice(0, 28);

  const dualWheels = ['20K', '25K'].includes(state.payloadClass);
  if (dualWheels) {
    state.fenderStyle = 'deck_over';
    state.trailerWidthIn = 102;
  } else {
    // Leaving deck-over restores a between-fender width unless width was also specified.
    if (Object.hasOwn(changes, 'fenderStyle') && !Object.hasOwn(changes, 'trailerWidthIn') &&
        state.fenderStyle !== 'deck_over' && state.trailerWidthIn === 102) {
      state.trailerWidthIn = 83;
    }
    if (state.trailerWidthIn === 102 || state.fenderStyle === 'deck_over') {
      state.fenderStyle = 'deck_over';
      state.trailerWidthIn = 102;
    }
  }
  if (state.rampStyle === 'slide_in' && state.rampPosition === 'standing') {
    state.rampPosition = 'deployed';
  }
  if (state.trailerType === 'cargo') {
    state.hitchStyle = 'bumper_pull';
    state.deckMaterial = 'wood';
  } else if (state.trailerType === 'dump') {
    state.deckMaterial = 'diamond_plate';
  }
  return state;
}

export function configurationURL(state, currentURL) {
  const url = new URL(currentURL);
  url.search = '';
  url.searchParams.set('config', JSON.stringify(normalizeConfig(state)));
  return url.toString();
}

export function configurationFromURL(url) {
  const params = new URL(url).searchParams;
  if (params.has('config')) {
    const text = params.get('config');
    if (text.length > 4000) throw new Error('This shared design is too large.');
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid shared design.');
    return normalizeConfig(value);
  }
  const keys = { type: 'trailerType', hitch: 'hitchStyle', env: 'environmentMode',
    dumpPos: 'dumpBedPosition', dumpDoor: 'dumpDoorStyle', width: 'trailerWidthIn',
    fender: 'fenderStyle', decal: 'decalText', cargoRear: 'cargoRearDoor', preset: 'cameraPreset' };
  const values = {};
  for (const [query, key] of Object.entries(keys)) {
    if (params.has(query)) values[key] = params.get(query);
  }
  if (params.has('truck')) values.showTowTruck = params.get('truck') === '1';
  return Object.keys(values).length ? normalizeConfig(values) : null;
}
