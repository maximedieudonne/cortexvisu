import { initLoadModal }     from '../viewer/loadModal.js';
import { initTextureModal }  from '../viewer/textureModal.js';
import { initNormalModal }   from '../viewer/normalModal.js';

import { getMeshes } from '../utils/sceneState.js';
import {
  updateTextureListForSelectedMesh,
  updateNormalListForSelectedMesh // ← à ajouter dans ui/meshSelection.js
} from './ui/meshSelection.js';

export function initModals() {
  const meshes = getMeshes();

  // Chargement des maillages (.gii)
  initLoadModal(meshes);

  // Chargement / association des textures (.func.gii, etc.)
  initTextureModal(meshes, updateTextureListForSelectedMesh);

  // Chargement / association des normales (.csv)
  initNormalModal(meshes, updateNormalListForSelectedMesh);
}
