export class MetricsDashboard {
  constructor(root) { this.root = root; }
  text(id, value) { const element = this.root.querySelector(`#${id}`); if (element) element.textContent = value; }
  update(state, m) {
    this.text('metric-gvwr', m.gvwrLbs.toLocaleString());
    this.text('metric-curb-weight', m.curbWeightLbs.toLocaleString());
    this.text('metric-payload', m.payloadCapacityLbs.toLocaleString());
    this.text('metric-axle-centroid', `${m.axleCentroidFromFrontFt.toFixed(1)} ft`);
    this.text('metric-axle-spread', `${m.axleCount} axle${m.axleCount === 1 ? '' : 's'} · ${m.tireSpec}`);
    this.text('metric-tongue-weight', m.estimatedTongueWeightLbs.toLocaleString());
    this.text('metric-tongue-pct', `${m.tongueWeightPct}%`);
    this.text('metric-deck-height', `${m.deckHeightIn.toFixed(1)} in`);
    this.text('metric-ramp-angle', m.hasLoadingRamp ? `${m.rampAngleDeg}°` : 'N/A');
    this.text('metric-ramp-caption', m.hasLoadingRamp ? 'when deployed' : 'equipment ramps');
    this.text('metric-breakover-angle', `${m.breakoverApexAngleDeg}°`);
    this.root.querySelector('#metric-breakover-row').hidden = !m.hasLoadingRamp;
    this.text('metric-coupler-height', `${m.couplerHeightIn.toFixed(1)} in`);
    this.text('metric-hitch-type', state.hitchStyle === 'gooseneck' ? 'Gooseneck' : 'Bumper pull');
    this.root.querySelector('#weight-warning').hidden = !m.weightExceedsRating;
  }
}
