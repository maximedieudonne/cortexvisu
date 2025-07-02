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
 * Fusionne les nouveaux assets sans écraser les précédents.
 * @param {object} meshMeta - L'objet userData.meta du mesh courant.
 */
export async function refreshMeshAssets(meshMeta) {
  if (!meshMeta?.path) return;                     // sécurité

  // Le dossier sujet = .../<sub-xxx>
  // On passe le chemin absolu pour que l’API sache où chercher
  try {
    const res = await fetch(`/api/mesh-assets/?mesh=${encodeURIComponent(meshMeta.path)}`);
    if (!res.ok) {
      console.warn('mesh-assets HTTP', res.status);
      return;
    }

    const { textures = [], normals = [] } = await res.json();

    /* ---------- fusionne sans doublon ------------------------------ */
    meshMeta.textures = Array.from(
      new Map([...(meshMeta.textures || []), ...textures]
        .map(t => [t.path || t, t]))                // clé = path
      .values()
    );

    meshMeta.normals = Array.from(
      new Map([...(meshMeta.normals || []), ...normals]
        .map(n => [n.path || n, n]))                // clé = path
      .values()
    );

    /* ---------- met à jour les listes déroulantes ------------------ */
    updateTextureListForSelectedMesh(meshMeta);
    updateNormalListForSelectedMesh(meshMeta);

    /* ---------- sélectionne la dernière normale -------------------- */
    if (meshMeta.normals?.length) {
      const normalSelect = document.getElementById('normal-list');
      if (normalSelect) {
        normalSelect.value = meshMeta.normals.at(-1).path;
        normalSelect.dispatchEvent(new Event('change'));
      }
    }
  } catch (err) {
    console.error('refreshMeshAssets:', err);
  }
}