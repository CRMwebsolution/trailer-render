import { normalizeConfig } from './config.js';
import { PhysicsMetrics } from './PhysicsMetrics.js';
import { computeLoadBalance } from './loadBalance.js';

const names = { flatbed: 'Flatbed / equipment', dump: 'Hydraulic dump', cargo: 'Enclosed cargo' };
const pounds = value => `${value.toLocaleString('en-US')} lb`;
export function designSummary(config) {
  const s = normalizeConfig(config), m = PhysicsMetrics.compute(s);
  const rows = [
    { key: 'type', label: 'Trailer', value: names[s.trailerType] },
    { key: 'length', label: 'Bed length', value: `${s.bedLengthFt} ft`, numeric: s.bedLengthFt, unit: 'ft' },
    { key: 'width', label: 'Bed width', value: `${m.bedWidthIn} in`, numeric: m.bedWidthIn, unit: 'in' },
    { key: 'deckHeight', label: 'Modeled deck height', value: `${m.deckHeightIn} in`, numeric: m.deckHeightIn, unit: 'in' },
    { key: 'rating', label: 'Selected gross class rating', value: pounds(m.gvwrLbs), numeric: m.gvwrLbs, unit: 'lb' },
    { key: 'empty', label: 'Estimated empty weight', value: pounds(m.curbWeightLbs), numeric: m.curbWeightLbs, unit: 'lb' },
    { key: 'payload', label: 'Estimated payload allowance', value: pounds(m.payloadCapacityLbs), numeric: m.payloadCapacityLbs, unit: 'lb' },
    { key: 'axles', label: 'Axles / wheels', value: `${m.axleCount} / ${m.wheelCount}` },
    { key: 'frame', label: 'Modeled main frame', value: m.mainBeamType },
    { key: 'hitch', label: 'Hitch', value: s.hitchStyle === 'gooseneck' ? 'Gooseneck' : 'Bumper pull' },
    { key: 'surface', label: 'Deck surface', value: s.deckMaterial === 'wood' ? 'Wood' : 'Diamond plate' },
    { key: 'finish', label: 'Finish', value: `${s.finishColor} · ${s.finishSheen}` },
    { key: 'decal', label: 'Signage', value: s.decalText || 'None' }
  ];
  if (s.trailerType === 'flatbed') rows.push({ key: 'motion', label: 'Ramps', value: `${s.rampStyle === 'slide_in' ? `${s.rampLengthFt} ft slide-in` : 'Fold-flat'} · ${s.rampDeploymentPct}% deployed` });
  if (s.trailerType === 'dump') rows.push({ key: 'motion', label: 'Dump bed / gate', value: `${s.dumpAngleDeg}° tilt · ${s.dumpDoorStyle}` });
  if (s.trailerType === 'cargo') rows.push({ key: 'motion', label: 'Cargo doors', value: `${s.cargoRearDoor} · ${s.cargoDoorOpenPct}% open · side door ${s.cargoSideDoor ? 'included' : 'omitted'}` });
  rows.push({ key: 'load', label: 'Load envelope', value: s.loadPreset === 'none' ? 'None' : `${s.loadLengthFt} ft × ${s.loadWidthIn} in × ${s.loadHeightIn} in · ${s.loadCenterPct}% center · ${s.loadYawDeg}°` });
  const balance = computeLoadBalance(s, m);
  if (balance.enabled) rows.push({ key: 'loadWeight', label: 'Assumed cargo weight', value: pounds(s.loadWeightLbs), numeric: s.loadWeightLbs, unit: 'lb' });
  if (balance.applicable) rows.push({ key: 'loadedTotal', label: 'Estimated loaded total', value: pounds(Math.round(balance.grossLbs)), numeric: Math.round(balance.grossLbs), unit: 'lb' }, { key: 'loadedHitch', label: 'Estimated loaded hitch support', value: pounds(Math.round(balance.hitchLbs)), numeric: Math.round(balance.hitchLbs), unit: 'lb' }, { key: 'loadedAxles', label: 'Estimated combined axle support', value: pounds(Math.round(balance.axleLbs)), numeric: Math.round(balance.axleLbs), unit: 'lb' });
  return rows;
}
export function compareDesigns(reference, current) {
  const a = new Map(designSummary(reference).map(row => [row.key, row]));
  return designSummary(current).map(row => {
    const before = a.get(row.key), changed = before?.value !== row.value;
    const delta = before?.numeric !== undefined && row.numeric !== undefined ? row.numeric - before.numeric : null;
    return { ...row, reference: before?.value || '—', changed,
      change: !changed ? 'Same' : delta !== null ? `${delta > 0 ? '+' : ''}${Number(delta.toFixed(1)).toLocaleString('en-US')} ${row.unit}` : 'Changed' };
  });
}
