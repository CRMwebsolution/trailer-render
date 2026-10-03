/**
 * UIController.js
 * Binds DOM form elements to StateStore, updates labels, manages UI conditional visibility,
 * and coordinates GLTF export actions.
 */
import { store } from '../core/StateStore.js';
import { globalBus } from '../core/EventBus.js';
import { gltfExporterService } from '../export/GLTFExporterService.js';

export class UIController {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.initElements();
    this.bindEvents();
    this.syncFromState(store.getState());
  }

  initElements() {
    // 1. Trailer Platform & Dimensions
    this.selectTrailerType = document.getElementById('select-trailer-type');
    this.sliderBedLength = document.getElementById('slider-bed-length');
    this.labelBedLength = document.getElementById('val-bed-length');
    this.selectTrailerWidth = document.getElementById('select-trailer-width');

    // 2. Fenders & Deck Style
    this.groupFenderControls = document.getElementById('group-fender-controls');
    this.radioFenderRegular = document.getElementById('fender-regular');
    this.radioFenderDriveover = document.getElementById('fender-driveover');
    this.radioFenderDeckover = document.getElementById('fender-deckover');

    // 3. Payload Class
    this.selectPayloadClass = document.getElementById('select-payload-class');

    // 4. Hitch Configuration
    this.groupHitchControls = document.getElementById('group-hitch-controls');
    this.radioHitchBP = document.getElementById('hitch-bp');
    this.radioHitchGN = document.getElementById('hitch-gn');

    // 5. Decking & Finish
    this.groupDeckControls = document.getElementById('group-deck-controls');
    this.radioDeckWood = document.getElementById('deck-wood');
    this.radioDeckSteel = document.getElementById('deck-steel');
    this.frameColorSwatches = document.querySelectorAll('.frame-color-swatch');

    // 6. Ramps (Flatbed)
    this.groupRampControls = document.getElementById('group-ramp-controls');
    this.radioRampSlide = document.getElementById('ramp-slide');
    this.radioRampFold = document.getElementById('ramp-fold');
    this.sliderRampLength = document.getElementById('slider-ramp-length');
    this.labelRampLength = document.getElementById('val-ramp-length');
    this.groupRampLength = document.getElementById('group-ramp-length');
    this.radioRampPosStowed = document.getElementById('ramp-pos-stowed');
    this.radioRampPosDeployed = document.getElementById('ramp-pos-deployed');
    this.radioRampPosStanding = document.getElementById('ramp-pos-standing');
    this.optionRampStanding = document.getElementById('option-ramp-standing');

    // 7. Dump Trailer Specifics
    this.groupDumpControls = document.getElementById('group-dump-controls');
    this.radioDumpPosLowered = document.getElementById('dump-pos-lowered');
    this.radioDumpPosRaised = document.getElementById('dump-pos-raised');
    this.radioDumpDoorBarn = document.getElementById('dump-door-barn');
    this.radioDumpDoorSpreader = document.getElementById('dump-door-spreader');

    // 8. Cargo Trailer Specifics
    this.groupCargoControls = document.getElementById('group-cargo-controls');
    this.radioCargoDoorRamp = document.getElementById('cargo-door-ramp');
    this.radioCargoDoorBarn = document.getElementById('cargo-door-barn');
    this.checkCargoSideDoor = document.getElementById('check-cargo-side-door');

    // 9. Signage & Custom Decals
    this.groupSignageControls = document.getElementById('group-signage-controls');
    this.inputDecalText = document.getElementById('input-decal-text');
    this.decalColorSwatches = document.querySelectorAll('.decal-color-swatch');

    // 10. Top Bar Actions & Camera
    this.envPresetBtns = document.querySelectorAll('.env-preset-btn[data-env]');
    this.btnToggleTruck = document.getElementById('btn-toggle-truck');
    this.truckBtnText = document.getElementById('truck-btn-text');
    this.inputTruckFile = document.getElementById('input-truck-file');
    this.btnResetTruck = document.getElementById('btn-reset-truck');
    this.cameraPresetBtns = document.querySelectorAll('.camera-preset-btn');
    this.btnToggleDimensions = document.getElementById('btn-toggle-dimensions');
    this.btnExport = document.getElementById('btn-export-glb');
    this.toastContainer = document.getElementById('toast-container');
  }

  syncFromState(state) {
    if (!state) return;

    // Platform & Dimensions
    if (this.selectTrailerType && state.trailerType) {
      this.selectTrailerType.value = state.trailerType;
    }
    if (this.sliderBedLength && state.bedLengthFt) {
      this.sliderBedLength.value = state.bedLengthFt;
      if (this.labelBedLength) this.labelBedLength.textContent = `${state.bedLengthFt} ft`;
    }
    if (this.selectTrailerWidth && state.trailerWidthIn) {
      this.selectTrailerWidth.value = String(state.trailerWidthIn);
    }

    // Fenders
    if (state.fenderStyle) {
      if (this.radioFenderRegular) this.radioFenderRegular.checked = state.fenderStyle === 'regular';
      if (this.radioFenderDriveover) this.radioFenderDriveover.checked = state.fenderStyle === 'drive_over';
      if (this.radioFenderDeckover) this.radioFenderDeckover.checked = state.fenderStyle === 'deck_over';
    }

    // Payload & Hitch
    if (this.selectPayloadClass && state.payloadClass) {
      this.selectPayloadClass.value = state.payloadClass;
    }
    if (this.radioHitchBP && this.radioHitchGN && state.hitchStyle) {
      this.radioHitchBP.checked = state.hitchStyle === 'bumper_pull';
      this.radioHitchGN.checked = state.hitchStyle === 'gooseneck';
    }

    // Deck & Materials
    if (this.radioDeckWood && this.radioDeckSteel && state.deckMaterial) {
      this.radioDeckWood.checked = state.deckMaterial === 'wood';
      this.radioDeckSteel.checked = state.deckMaterial === 'diamond_plate';
    }

    // Ramps
    if (this.radioRampSlide && this.radioRampFold && state.rampStyle) {
      this.radioRampSlide.checked = state.rampStyle === 'slide_in';
      this.radioRampFold.checked = state.rampStyle === 'fold_flat';
      this.updateRampUI(state.rampStyle);
    }
    if (this.sliderRampLength && state.rampLengthFt) {
      this.sliderRampLength.value = state.rampLengthFt;
      if (this.labelRampLength) this.labelRampLength.textContent = `${state.rampLengthFt.toFixed(1)} ft`;
    }
    if (this.radioRampPosStowed && this.radioRampPosDeployed && this.radioRampPosStanding && state.rampPosition) {
      this.radioRampPosStowed.checked = state.rampPosition === 'stowed';
      this.radioRampPosDeployed.checked = state.rampPosition === 'deployed';
      this.radioRampPosStanding.checked = state.rampPosition === 'standing';
    }

    // Dump Trailer
    if (this.radioDumpPosLowered && this.radioDumpPosRaised && state.dumpBedPosition) {
      this.radioDumpPosLowered.checked = state.dumpBedPosition === 'lowered';
      this.radioDumpPosRaised.checked = state.dumpBedPosition === 'raised';
    }
    if (this.radioDumpDoorBarn && this.radioDumpDoorSpreader && state.dumpDoorStyle) {
      this.radioDumpDoorBarn.checked = state.dumpDoorStyle === 'barn';
      this.radioDumpDoorSpreader.checked = state.dumpDoorStyle === 'spreader';
    }

    // Cargo Trailer
    if (this.radioCargoDoorRamp && this.radioCargoDoorBarn && state.cargoRearDoor) {
      this.radioCargoDoorRamp.checked = state.cargoRearDoor === 'ramp';
      this.radioCargoDoorBarn.checked = state.cargoRearDoor === 'barn';
    }
    if (this.checkCargoSideDoor && typeof state.cargoSideDoor === 'boolean') {
      this.checkCargoSideDoor.checked = state.cargoSideDoor;
    }

    // Signage
    if (this.inputDecalText && state.decalText !== undefined) {
      this.inputDecalText.value = state.decalText;
    }

    // Environment & Tow Truck
    if (this.envPresetBtns && state.environmentMode) {
      this.envPresetBtns.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-env') === state.environmentMode);
      });
    }
    if (this.btnToggleTruck) {
      this.btnToggleTruck.classList.toggle('active', !!state.showTowTruck);
    }

    // Update dynamic group visibility
    this.updateTrailerTypeUI(state.trailerType);
  }

  updateTrailerTypeUI(trailerType) {
    if (trailerType === 'flatbed') {
      if (this.groupRampControls) this.groupRampControls.style.display = 'flex';
      if (this.groupDumpControls) this.groupDumpControls.style.display = 'none';
      if (this.groupCargoControls) this.groupCargoControls.style.display = 'none';
      if (this.groupFenderControls) this.groupFenderControls.style.display = 'flex';
      if (this.groupDeckControls) this.groupDeckControls.style.display = 'flex';
      if (this.groupHitchControls) this.groupHitchControls.style.display = 'flex';
    } else if (trailerType === 'dump') {
      if (this.groupRampControls) this.groupRampControls.style.display = 'none';
      if (this.groupDumpControls) this.groupDumpControls.style.display = 'flex';
      if (this.groupCargoControls) this.groupCargoControls.style.display = 'none';
      if (this.groupFenderControls) this.groupFenderControls.style.display = 'flex';
      if (this.groupDeckControls) this.groupDeckControls.style.display = 'none';
      if (this.groupHitchControls) this.groupHitchControls.style.display = 'flex';
    } else if (trailerType === 'cargo') {
      if (this.groupRampControls) this.groupRampControls.style.display = 'none';
      if (this.groupDumpControls) this.groupDumpControls.style.display = 'none';
      if (this.groupCargoControls) this.groupCargoControls.style.display = 'flex';
      if (this.groupFenderControls) this.groupFenderControls.style.display = 'none';
      if (this.groupDeckControls) this.groupDeckControls.style.display = 'none';
      if (this.groupHitchControls) this.groupHitchControls.style.display = 'none'; // A-frame standard on all cargo
    }
  }

  bindEvents() {
    // 1. Trailer Type
    if (this.selectTrailerType) {
      this.selectTrailerType.addEventListener('change', (e) => {
        const newType = e.target.value;
        store.update({ trailerType: newType });
        this.updateTrailerTypeUI(newType);
        this.showToast(`Switched trailer type to ${e.target.options[e.target.selectedIndex].text}`);
      });
    }

    // 2. Bed Length Slider
    if (this.sliderBedLength) {
      this.sliderBedLength.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        if (this.labelBedLength) this.labelBedLength.textContent = `${val} ft`;
        store.update({ bedLengthFt: val });
      });
    }

    // 3. Trailer Width Dropdown
    if (this.selectTrailerWidth) {
      this.selectTrailerWidth.addEventListener('change', (e) => {
        const width = Number(e.target.value);
        const updates = { trailerWidthIn: width };
        if (width === 102) {
          updates.fenderStyle = 'deck_over';
        } else if (store.getState().fenderStyle === 'deck_over') {
          updates.fenderStyle = 'regular';
        }
        store.update(updates);
        this.syncFromState(store.getState());
        this.showToast(`Set trailer width to ${width} inches`);
      });
    }

    // 4. Fender & Deck Style
    [this.radioFenderRegular, this.radioFenderDriveover, this.radioFenderDeckover].forEach(radio => {
      if (radio) {
        radio.addEventListener('change', (e) => {
          if (e.target.checked) {
            const style = e.target.value;
            const updates = { fenderStyle: style };
            if (style === 'deck_over') {
              updates.trailerWidthIn = 102;
            }
            store.update(updates);
            this.syncFromState(store.getState());
          }
        });
      }
    });

    // 5. Payload Class Dropdown
    if (this.selectPayloadClass) {
      this.selectPayloadClass.addEventListener('change', (e) => {
        store.update({ payloadClass: e.target.value });
      });
    }

    // 6. Hitch Style Toggle
    [this.radioHitchBP, this.radioHitchGN].forEach(radio => {
      if (radio) {
        radio.addEventListener('change', (e) => {
          if (e.target.checked) {
            store.update({ hitchStyle: e.target.value });
            this.showToast(`Configured for ${e.target.value === 'gooseneck' ? 'Gooseneck Hitch' : 'Bumper Pull Receiver'}`);
          }
        });
      }
    });

    // 7. Deck Material Toggle
    [this.radioDeckWood, this.radioDeckSteel].forEach(radio => {
      if (radio) {
        radio.addEventListener('change', (e) => {
          if (e.target.checked) {
            store.update({ deckMaterial: e.target.value });
          }
        });
      }
    });

    // 8. Frame Finish Color Swatches
    this.frameColorSwatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        this.frameColorSwatches.forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        const color = swatch.getAttribute('data-color');
        store.update({ finishColor: color });
      });
    });

    // 9. Ramp Style Toggle
    [this.radioRampSlide, this.radioRampFold].forEach(radio => {
      if (radio) {
        radio.addEventListener('change', (e) => {
          if (e.target.checked) {
            const style = e.target.value;
            this.updateRampUI(style);
            store.update({ rampStyle: style });
          }
        });
      }
    });

    // 10. Ramp Length Slider (Slide-In)
    if (this.sliderRampLength) {
      this.sliderRampLength.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        if (this.labelRampLength) this.labelRampLength.textContent = `${val.toFixed(1)} ft`;
        store.update({ rampLengthFt: val });
      });
    }

    // 11. Ramp Position Toggle
    [this.radioRampPosStowed, this.radioRampPosDeployed, this.radioRampPosStanding].forEach(radio => {
      if (radio) {
        radio.addEventListener('change', (e) => {
          if (e.target.checked) {
            store.update({ rampPosition: e.target.value });
          }
        });
      }
    });

    // 12. Dump Bed Position Toggle
    [this.radioDumpPosLowered, this.radioDumpPosRaised].forEach(radio => {
      if (radio) {
        radio.addEventListener('change', (e) => {
          if (e.target.checked) {
            store.update({ dumpBedPosition: e.target.value });
            this.showToast(`Dump Bed: ${e.target.value === 'raised' ? 'Raised (42° Tilt)' : 'Lowered (Transport)'}`);
          }
        });
      }
    });

    // 13. Dump Door Style Toggle
    [this.radioDumpDoorBarn, this.radioDumpDoorSpreader].forEach(radio => {
      if (radio) {
        radio.addEventListener('change', (e) => {
          if (e.target.checked) {
            store.update({ dumpDoorStyle: e.target.value });
          }
        });
      }
    });

    // 14. Cargo Rear Door Style Toggle
    [this.radioCargoDoorRamp, this.radioCargoDoorBarn].forEach(radio => {
      if (radio) {
        radio.addEventListener('change', (e) => {
          if (e.target.checked) {
            store.update({ cargoRearDoor: e.target.value });
          }
        });
      }
    });

    // 15. Cargo Side Door Checkbox
    if (this.checkCargoSideDoor) {
      this.checkCargoSideDoor.addEventListener('change', (e) => {
        store.update({ cargoSideDoor: e.target.checked });
      });
    }

    // 16. Custom Decal Text Input
    if (this.inputDecalText) {
      this.inputDecalText.addEventListener('input', (e) => {
        store.update({ decalText: e.target.value });
      });
    }

    // 17. Decal Color Swatches
    this.decalColorSwatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        this.decalColorSwatches.forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        const color = swatch.getAttribute('data-decal-color');
        store.update({ decalColor: color });
      });
    });

    // 18. Environment Presets (Dark, White, Showroom)
    this.envPresetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-env');
        store.update({ environmentMode: mode });
        this.envPresetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.showToast(`Studio environment: ${mode.toUpperCase()}`);
      });
    });

    // 19. Tow Truck Toggle & Custom 3D Model Loading
    if (this.btnToggleTruck) {
      this.btnToggleTruck.addEventListener('click', () => {
        const current = store.getState().showTowTruck;
        const next = !current;
        store.update({ showTowTruck: next });
        this.btnToggleTruck.classList.toggle('active', next);
        this.sceneManager.setCameraPreset('side', store.getMetrics(), next);
        const truckName = (this.sceneManager.towTruck && this.sceneManager.towTruck.isCustom)
          ? (this.sceneManager.towTruck.customModelName || 'Custom 3D Truck')
          : '2016 Ford F-250';
        this.showToast(next ? `Tow Vehicle (${truckName}) Attached` : 'Tow Vehicle Removed');
      });
    }

    if (this.inputTruckFile) {
      this.inputTruckFile.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        this.showToast(`Loading 3D Model: ${file.name}...`);
        this.sceneManager.towTruck.loadCustomTruck(
          file,
          file.name,
          (loadedName) => {
            store.update({ showTowTruck: true });
            if (this.btnToggleTruck) this.btnToggleTruck.classList.add('active');
            if (this.truckBtnText) this.truckBtnText.textContent = file.name.length > 12 ? `${file.name.substring(0, 10)}...` : file.name;
            if (this.btnResetTruck) this.btnResetTruck.style.display = 'inline-flex';
            this.sceneManager.setCameraPreset('side', store.getMetrics(), true);
            this.showToast(`Custom 3D Truck Loaded: ${file.name}`);
          },
          (err) => {
            this.showToast(`Failed to parse 3D asset: ${err.message || 'Error'}`);
          }
        );
      });
    }

    if (this.btnResetTruck) {
      this.btnResetTruck.addEventListener('click', () => {
        this.sceneManager.towTruck.resetToProcedural();
        if (this.truckBtnText) this.truckBtnText.textContent = 'F-250 Truck';
        this.btnResetTruck.style.display = 'none';
        this.showToast('Reset to procedural 2016 Ford F-250');
      });
    }

    // 20. Camera Presets
    this.cameraPresetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.cameraPresetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const preset = btn.getAttribute('data-preset');
        this.sceneManager.setCameraPreset(preset, store.getMetrics(), !!store.getState().showTowTruck);
      });
    });

    // 21. Dimension Overlay Toggle
    if (this.btnToggleDimensions) {
      this.btnToggleDimensions.addEventListener('click', () => {
        const cur = store.getState().showDimensions;
        store.update({ showDimensions: !cur });
        this.btnToggleDimensions.classList.toggle('active', !cur);
      });
    }

    // 22. Export GLB Button
    if (this.btnExport) {
      this.btnExport.addEventListener('click', async () => {
        const originalText = this.btnExport.innerHTML;
        try {
          this.btnExport.disabled = true;
          this.btnExport.innerHTML = `<span>Exporting 3D Model...</span>`;
          const activeTrailer = this.sceneManager.activeTrailer;
          if (!activeTrailer) throw new Error('Trailer model is still initializing.');

          const result = await gltfExporterService.exportGLB(
            activeTrailer.rootGroup,
            store.getState(),
            store.getMetrics()
          );

          this.showToast(`Exported ${result.fileName} (${result.fileSizeKb} KB)`);
        } catch (err) {
          console.error('Export error:', err);
          this.showToast(`Export failed: ${err.message}`, 4000);
        } finally {
          this.btnExport.disabled = false;
          this.btnExport.innerHTML = originalText;
        }
      });
    }
  }

  updateRampUI(rampStyle) {
    if (rampStyle === 'slide_in') {
      if (this.groupRampLength) this.groupRampLength.style.display = 'flex';
      if (this.optionRampStanding) this.optionRampStanding.style.display = 'none';
      if (this.radioRampPosStanding && this.radioRampPosStanding.checked) {
        if (this.radioRampPosDeployed) this.radioRampPosDeployed.checked = true;
        store.update({ rampPosition: 'deployed' });
      }
    } else {
      if (this.groupRampLength) this.groupRampLength.style.display = 'none';
      if (this.optionRampStanding) this.optionRampStanding.style.display = 'block';
    }
  }

  showToast(message, duration = 3000) {
    if (!this.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
}
