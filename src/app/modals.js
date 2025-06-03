import { initLoadModal } from '../viewer/loadModal.js';
import { initTextureModal } from '../viewer/textureModal.js';
import { getMeshes } from '../utils/sceneState.js';
import { updateTextureListForSelectedMesh } from './ui/meshSelection.js';

export function initModals() {
  const meshes = getMeshes();
  initLoadModal(meshes);
  initTextureModal(meshes, updateTextureListForSelectedMesh);
}



