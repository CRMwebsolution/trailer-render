// Shared procedural-model dimensions, not measurements of a manufactured trailer.
export const MODEL_GEOMETRY = Object.freeze({
  bumperTongueM: 1.45, gooseneckReachM: 2.14,
  cargoBoxHeightM: 2.15, cargoWallThicknessM: .04, cargoFloorThicknessM: .02,
  cargoNoseLengthM: .76, cargoDoorInsetM: .08, dumpWallHeightM: .61
});

export function formatDistance(meters, units = 'imperial', short = false) {
  if (!Number.isFinite(meters)) return '—';
  if (units === 'metric') return `${meters.toFixed(2)} m`;
  const inches = meters / .0254;
  if (short || inches < 36) return `${Number(inches.toFixed(1))} in`;
  const total = Math.round(inches * 10) / 10;
  const feet = Math.floor(total / 12);
  return `${feet} ft ${Number((total - feet * 12).toFixed(1))} in`;
}

export function measurementValues(metrics, bounds) {
  const m = metrics;
  const hitchX = -(m.hitchStyle === 'gooseneck' ? MODEL_GEOMETRY.gooseneckReachM : MODEL_GEOMETRY.bumperTongueM);
  return {
    hitchX, deckLength: m.bedLengthM, deckWidth: m.bedWidthM, deckHeight: m.deckHeightM,
    hitchToAxle: m.axleCentroidFromFrontM - hitchX,
    overallLength: bounds ? bounds.max.x - bounds.min.x : m.bedLengthM - hitchX,
    interiorWidth: m.bedWidthM - MODEL_GEOMETRY.cargoWallThicknessM,
    interiorHeight: MODEL_GEOMETRY.cargoBoxHeightM - MODEL_GEOMETRY.cargoFloorThicknessM,
    doorWidth: m.bedWidthM - MODEL_GEOMETRY.cargoDoorInsetM,
    doorHeight: MODEL_GEOMETRY.cargoBoxHeightM - MODEL_GEOMETRY.cargoDoorInsetM
  };
}
