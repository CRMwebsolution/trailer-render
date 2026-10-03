export function initialQualityTier({ deviceMemory, hardwareConcurrency, saveData } = {}) {
  return saveData || deviceMemory && deviceMemory <= 2 || hardwareConcurrency && hardwareConcurrency <= 2 ? 'economy' : 'balanced';
}

export function qualitySettings(mode, tier, smallScreen = false) {
  if (mode === 'high') return { pixelCap: 2, shadowSize: 4096, anisotropy: 8 };
  if (mode === 'low') return { pixelCap: 1, shadowSize: 0, anisotropy: 1 };
  if (tier === 'minimal') return { pixelCap: 1, shadowSize: 0, anisotropy: 2 };
  if (tier === 'economy') return { pixelCap: 1, shadowSize: 1024, anisotropy: 2 };
  return { pixelCap: smallScreen ? 1.25 : 1.75, shadowSize: smallScreen ? 1024 : 2048, anisotropy: 4 };
}

export class AdaptiveQuality {
  constructor(tier = 'balanced') { this.reset(tier); }
  reset(tier = 'balanced') { this.tier = tier; this.samples = []; this.warmup = 12; }
  sample(frameMs, active = true) {
    // Ignore idle gaps, background pauses and initial shader compilation.
    if (!active || !Number.isFinite(frameMs) || frameMs <= 0 || frameMs > 500) { this.samples = []; return false; }
    if (this.warmup > 0) { this.warmup--; return false; }
    this.samples.push(frameMs);
    if (this.samples.length < 36) return false;
    const sorted = this.samples.sort((a, b) => a - b), slow = sorted[Math.floor(sorted.length * .8)] > 28;
    this.samples = [];
    if (!slow || this.tier === 'minimal') return false;
    this.tier = this.tier === 'balanced' ? 'economy' : 'minimal'; this.warmup = 18;
    return true;
  }
}
