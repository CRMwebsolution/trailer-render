import { normalizeConfig } from './config.js';
// Dimensions of a generic reference pickup, not a verified manufacturer configuration.
export function truckGeometry(config) {
  const s = normalizeConfig(config);
  const wheelbaseM = s.truckWheelbaseIn * .0254, widthM = s.truckWidthIn * .0254;
  const hitchOffsetM = s.truckRearHitchOffsetIn * .0254, frontOverhangM = 1.16;
  const cabRearX = -1.092, hoodEndX = -wheelbaseM - frontOverhangM + .14;
  const hoodStartX = hoodEndX + 1.45, rearBodyX = hitchOffsetM - .21;
  return { wheelbaseM, widthM, hitchOffsetM, frontOverhangM, cabRearX, hoodEndX, hoodStartX,
    cabLengthM: cabRearX - hoodStartX, bedLengthM: rearBodyX + 1.075, bedCenterX: (rearBodyX - 1.075) / 2, rearBodyX };
}
