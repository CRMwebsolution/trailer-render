import { normalizeConfig } from './config.js';
import { measurementValues } from './modelGeometry.js';

export const LOAD_PRESETS = {
  pallet: { loadLengthFt: 4, loadWidthIn: 48, loadHeightIn: 48 },
  car: { loadLengthFt: 15, loadWidthIn: 72, loadHeightIn: 60 },
  equipment: { loadLengthFt: 12, loadWidthIn: 78, loadHeightIn: 84 }
};

// A rectangular envelope against the procedural model, with no loading-path simulation.
export function computeCargoFit(config, metrics) {
  const s = normalizeConfig(config), v = measurementValues(metrics);
  const length = s.loadLengthFt * .3048, width = s.loadWidthIn * .0254, height = s.loadHeightIn * .0254;
  const yaw = s.loadYawDeg * Math.PI / 180;
  const spanX = Math.abs(Math.cos(yaw)) * length + Math.abs(Math.sin(yaw)) * width;
  const spanZ = Math.abs(Math.sin(yaw)) * length + Math.abs(Math.cos(yaw)) * width;
  const centerX = metrics.bedLengthM * s.loadCenterPct / 100, centerZ = s.loadLateralIn * .0254;
  const inset = s.trailerType === 'dump' ? .05 : 0;
  const availableWidth = s.trailerType === 'cargo' ? v.interiorWidth : metrics.bedWidthM - inset * 2;
  const frontGap = centerX - spanX / 2 - inset, rearGap = metrics.bedLengthM - inset - centerX - spanX / 2;
  const sideGap = availableWidth / 2 - Math.abs(centerZ) - spanZ / 2;
  const roofGap = s.trailerType === 'cargo' ? v.interiorHeight - height : null;
  const fits = frontGap >= -1e-6 && rearGap >= -1e-6 && sideGap >= -1e-6 && (roofGap === null || roofGap >= -1e-6);
  const doorFits = s.trailerType === 'cargo' ? spanZ <= v.doorWidth + 1e-6 && height <= v.doorHeight + 1e-6 : null;
  return { enabled: s.loadPreset !== 'none', length, width, height, yaw, centerX, centerZ, spanX, spanZ,
    frontGap, rearGap, sideGap, roofGap, fits, doorFits };
}
