// app/initApp.js

import { setupSceneAndRendering } from './sceneSetup.js';
import { bindUIEvents } from './uiEvents.js';
import { initModals } from './modals.js';

export function initApp() {
  setupSceneAndRendering();
  bindUIEvents();
  initModals();
}
