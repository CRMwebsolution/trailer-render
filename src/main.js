/**
 * main.js
 * Application entry point orchestrating 3D Scene, StateStore, UI Controller, and Metrics HUD.
 */
import { store } from './core/StateStore.js';
import { SceneManager } from './scene/SceneManager.js';
import { UIController } from './ui/UIController.js';
import { MetricsDashboard } from './ui/MetricsDashboard.js';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('webgl-canvas');
  if (!canvas) {
    console.error('WebGL canvas element not found.');
    return;
  }

  // 1. Initialize Three.js Scene Manager
  const sceneManager = new SceneManager(canvas);

  // 2. Initialize Telemetry Dashboard
  const metricsDashboard = new MetricsDashboard(document.querySelector('.metrics-dashboard'));

  // 3. Initialize UI Controller
  const uiController = new UIController(sceneManager);

  // 4. Subscribe to StateStore changes
  store.subscribe((state, metrics, prevState) => {
    // A. Update 3D Trailer Geometry & Materials
    sceneManager.updateTrailer(state, metrics);

    // B. Update Read-only Telemetry Dashboard
    metricsDashboard.update(state, metrics);

    // C. Adjust camera framing if length changed significantly
    if (prevState && prevState.bedLengthFt !== state.bedLengthFt) {
      sceneManager.cameraController.fitToTrailer(metrics);
    }
  });

  const urlParams = new URLSearchParams(window.location.search);
  const initialUpdates = {};
  if (urlParams.get('type')) initialUpdates.trailerType = urlParams.get('type');
  if (urlParams.get('hitch')) initialUpdates.hitchStyle = urlParams.get('hitch');
  if (urlParams.get('truck') === '1') initialUpdates.showTowTruck = true;
  if (urlParams.get('env')) initialUpdates.environmentMode = urlParams.get('env');
  if (urlParams.get('dumpPos')) initialUpdates.dumpBedPosition = urlParams.get('dumpPos');
  if (urlParams.get('dumpDoor')) initialUpdates.dumpDoorStyle = urlParams.get('dumpDoor');
  if (urlParams.get('width')) initialUpdates.trailerWidthIn = Number(urlParams.get('width'));
  if (urlParams.get('fender')) initialUpdates.fenderStyle = urlParams.get('fender');
  if (urlParams.get('decal')) initialUpdates.decalText = urlParams.get('decal');
  if (urlParams.get('cargoRear')) initialUpdates.cargoRearDoor = urlParams.get('cargoRear');

  if (Object.keys(initialUpdates).length > 0) {
    store.update(initialUpdates);
    uiController.syncFromState(store.getState());
  }

  const presetParam = urlParams.get('preset');
  if (presetParam) {
    sceneManager.setCameraPreset(presetParam, store.getMetrics(), !!store.getState().showTowTruck, true);
    document.querySelectorAll('.camera-preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-preset') === presetParam);
    });
  }

  console.log('Trailer Configurator 3D fully initialized.');
});
