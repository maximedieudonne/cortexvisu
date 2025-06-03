// app/sceneSetup.js

import { setupScene, startRenderingLoop } from '../viewer/viewer.js';
import { updateSceneState } from '../utils/sceneState.js';

export function setupSceneAndRendering() {
  const { scene, camera, setBackgroundColor } = setupScene();
  updateSceneState({ scene, camera });

  const bgInput = document.getElementById('bg-color-picker');
  if (bgInput) {
    setBackgroundColor(bgInput.value);
    bgInput.addEventListener('input', () => {
      setBackgroundColor(bgInput.value);
    });
  }

  startRenderingLoop(scene, camera);
}
