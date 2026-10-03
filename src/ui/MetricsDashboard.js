/**
 * MetricsDashboard.js
 * Real-time HUD telemetry dashboard displaying towing kinematics, clearances, and Ford F-250 specs.
 */
export class MetricsDashboard {
  constructor(domRoot) {
    this.root = domRoot;
    this.bindElements();
  }

  bindElements() {
    // Weight & Capacity
    this.elGvwr = this.root.querySelector('#metric-gvwr');
    this.elCurbWeight = this.root.querySelector('#metric-curb-weight');
    this.elPayload = this.root.querySelector('#metric-payload');

    // Axle & Weight Distribution
    this.elAxleCentroid = this.root.querySelector('#metric-axle-centroid');
    this.elTongueWeight = this.root.querySelector('#metric-tongue-weight');
    this.elTonguePct = this.root.querySelector('#metric-tongue-pct');
    this.elAxleSpread = this.root.querySelector('#metric-axle-spread');

    // Loading & Angles
    this.elDeckHeight = this.root.querySelector('#metric-deck-height');
    this.elRampAngle = this.root.querySelector('#metric-ramp-angle');
    this.elBreakoverAngle = this.root.querySelector('#metric-breakover-angle');
    this.elWheelbaseLimit = this.root.querySelector('#metric-wheelbase-limit');

    // Tow Vehicle Clearances (2016 Ford F-250 6.5ft bed)
    this.elHitchType = this.root.querySelector('#metric-hitch-type');
    this.elCouplerHeight = this.root.querySelector('#metric-coupler-height');
    this.elF250BedRail = this.root.querySelector('#metric-f250-bed-rail');
    this.elF250CabMargin = this.root.querySelector('#metric-f250-cab-margin');
    this.elF250Badge = this.root.querySelector('#metric-f250-badge');
  }

  /**
   * Updates all metrics elements immediately.
   * @param {Object} state 
   * @param {Object} metrics 
   */
  update(state, metrics) {
    if (!metrics) return;

    // 1. Weights
    if (this.elGvwr) this.elGvwr.textContent = metrics.gvwrLbs.toLocaleString();
    if (this.elCurbWeight) this.elCurbWeight.textContent = metrics.curbWeightLbs.toLocaleString();
    if (this.elPayload) this.elPayload.textContent = metrics.payloadCapacityLbs.toLocaleString();

    // 2. Axle Kinematics (60/40 Rule)
    if (this.elAxleCentroid) {
      this.elAxleCentroid.textContent = `${metrics.axleCentroidFromFrontFt.toFixed(1)} ft (${metrics.axleCentroidPct.toFixed(0)}%)`;
    }
    if (this.elTongueWeight) this.elTongueWeight.textContent = metrics.estimatedTongueWeightLbs.toLocaleString();
    if (this.elTonguePct) this.elTonguePct.textContent = `${metrics.tongueWeightPct}%`;
    if (this.elAxleSpread) {
      const axleText = metrics.axleCount === 1 ? 'Single Axle' : (metrics.axleCount === 2 ? 'Tandem Equalized' : 'Triple Axle');
      this.elAxleSpread.textContent = `${axleText} (${metrics.tireSpec})`;
    }

    // 3. Loading Angles & Breakover
    if (this.elDeckHeight) this.elDeckHeight.textContent = `${metrics.deckHeightIn.toFixed(1)}"`;
    if (this.elRampAngle) this.elRampAngle.textContent = `${metrics.rampAngleDeg}°`;
    if (this.elBreakoverAngle) this.elBreakoverAngle.textContent = `${metrics.breakoverApexAngleDeg}°`;
    if (this.elWheelbaseLimit) this.elWheelbaseLimit.textContent = `${metrics.maxWheelbaseIn}"`;

    // 4. Hitch & 2016 Ford F-250 6.5ft Cab Clearance
    if (this.elHitchType) {
      this.elHitchType.textContent = state.hitchStyle === 'gooseneck' ? 'Gooseneck Tower' : 'Bumper Pull A-Frame';
    }
    if (this.elCouplerHeight) {
      this.elCouplerHeight.textContent = `${metrics.couplerHeightIn.toFixed(1)}"`;
    }

    if (state.hitchStyle === 'gooseneck') {
      if (this.elF250BedRail) this.elF250BedRail.textContent = `+${metrics.f250BedRailClearanceIn.toFixed(1)}"`;
      if (this.elF250CabMargin) this.elF250CabMargin.textContent = `${metrics.f250CabClearanceMarginIn > 0 ? '+' : ''}${metrics.f250CabClearanceMarginIn.toFixed(1)}"`;

      if (this.elF250Badge) {
        this.elF250Badge.style.display = 'inline-flex';
        this.elF250Badge.textContent = `F-250 6.5': ${metrics.f250ClearanceStatus}`;
        this.elF250Badge.className = 'clearance-badge';
        if (metrics.f250ClearanceStatus === 'SAFE') {
          this.elF250Badge.classList.add('safe');
        } else if (metrics.f250ClearanceStatus === 'TIGHT CLEARANCE') {
          this.elF250Badge.classList.add('warning');
        } else {
          this.elF250Badge.classList.add('danger');
        }
      }
    } else {
      if (this.elF250BedRail) this.elF250BedRail.textContent = 'N/A (Receiver)';
      if (this.elF250CabMargin) this.elF250CabMargin.textContent = 'Full Cab Clearance';
      if (this.elF250Badge) {
        this.elF250Badge.style.display = 'inline-flex';
        this.elF250Badge.textContent = 'Receiver Hitch (19" Height Level)';
        this.elF250Badge.className = 'clearance-badge safe';
      }
    }
  }
}
