import { normalizeConfig } from './config.js';
import { measurementValues } from './modelGeometry.js';

// Level-trailer equilibrium: R_h * (axleX - hitchX) = W_load * (axleX - loadX).
// Empty hitch support remains an assumed percentage, not a measured center of mass.
// https://openstax.org/books/university-physics-volume-1/pages/12-1-conditions-for-static-equilibrium
export function computeLoadBalance(config, metrics) {
  const s = normalizeConfig(config), v = measurementValues(metrics);
  const enabled = s.loadPreset !== 'none', loadWeightLbs = enabled ? s.loadWeightLbs : 0;
  const loadX = metrics.bedLengthM * s.loadCenterPct / 100;
  const loadHitchLbs = loadWeightLbs * (metrics.axleCentroidFromFrontM - loadX) / v.hitchToAxle;
  const hitchLbs = metrics.estimatedTongueWeightLbs + loadHitchLbs;
  const grossLbs = metrics.curbWeightLbs + loadWeightLbs, axleLbs = grossLbs - hitchLbs;
  return { enabled, applicable: enabled && (s.trailerType !== 'dump' || s.dumpAngleDeg === 0), loadX,
    loadWeightLbs, loadHitchLbs, hitchLbs, axleLbs, grossLbs, hitchPct: grossLbs ? hitchLbs / grossLbs * 100 : 0,
    grossRemainingLbs: metrics.gvwrLbs - grossLbs,
    axleRemainingLbs: metrics.axleCount * metrics.axleRatingLbs - axleLbs,
    emptyHitchAssumptionPct: metrics.tongueWeightPct };
}
