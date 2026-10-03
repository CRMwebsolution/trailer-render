import { store } from './core/StateStore.js';
import { configurationFromURL } from './core/config.js';
import { SceneManager } from './scene/SceneManager.js';
import { UIController } from './ui/UIController.js';
import { MetricsDashboard } from './ui/MetricsDashboard.js';

let sharedDesignError;
try {
  const shared = configurationFromURL(window.location.href);
  if (shared) store.replace(shared);
} catch { sharedDesignError = 'The shared design could not be read. Showing the default trailer.'; }

const canvas = document.getElementById('webgl-canvas');
try {
  const sceneManager = new SceneManager(canvas);
  const metricsDashboard = new MetricsDashboard(document.querySelector('.metrics-dashboard'));
  const uiController = new UIController(sceneManager);
  const unsubscribe = store.subscribe((state, metrics, previous) => {
    sceneManager.updateTrailer(state, metrics, previous);
    metricsDashboard.update(state, metrics);
  });
  if (sharedDesignError) uiController.showToast(sharedDesignError);
  window.addEventListener('pagehide', event => {
    if (!event.persisted) {
      unsubscribe(); uiController.dispose(); sceneManager.dispose();
    }
  });
} catch (error) {
  console.error('Unable to initialize the 3D studio:', error);
  const status = document.getElementById('viewport-status');
  status.hidden = false;
  status.textContent = 'The 3D view could not start. Enable hardware acceleration or try another browser.';
  const button = document.createElement('button');
  button.className = 'secondary-btn'; button.textContent = 'Try again';
  button.addEventListener('click', () => window.location.reload());
  status.appendChild(button);
}
