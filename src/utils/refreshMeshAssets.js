// utils/refreshMeshAssets.js
// ------------------------------------------------------------
// Interroge /api/mesh-assets/ pour récupérer les textures (.gii)
// et normales (.csv) stockées dans public/<meshFolder>/ et met à
// jour les listes déroulantes.
// ------------------------------------------------------------

import {
  updateTextureListForSelectedMesh,
  updateNormalListForSelectedMesh
} from '../app/ui/meshSelection.js';

/** Retourne le nom du dossier dans public/ où sont stockés les fichiers.
 *  ex. "lh.white.gii" → "lh.white"  */
function meshFolderName(name = '') {
  return name.replace(/\.[^.]+$/i, ''); // supprime la dernière extension
}

/**
 * Rafraîchit les assets (textures, normales) du mesh courant.
 * @param {object} meshMeta - L'objet userData.meta du mesh courant.
 */
export async function refreshMeshAssets(meshMeta) {
  if (!meshMeta?.name) return;

  const folder = meshFolderName(meshMeta.name);      // "lh.white"
  try {
    const res = await fetch(`/api/mesh-assets/?mesh=${encodeURIComponent(folder)}`);
    if (!res.ok) {
      console.warn('mesh-assets HTTP', res.status);
      return;
    }

    const { textures = [], normals = [] } = await res.json();

    // met à jour le meta puis l'UI
    meshMeta.textures = textures;
    meshMeta.normals  = normals;

    updateTextureListForSelectedMesh(meshMeta);
    updateNormalListForSelectedMesh(meshMeta);

    // sélectionne automatiquement la dernière normale ajoutée si dispo
    if (normals.length) {
      const normalSelect = document.getElementById('normal-list');
      if (normalSelect) {
        normalSelect.value = normals[normals.length - 1].path;
        normalSelect.dispatchEvent(new Event('change'));
      }
    }
  } catch (err) {
    console.error('refreshMeshAssets:', err);
  }
}
