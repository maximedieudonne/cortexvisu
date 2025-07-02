// meshSelection.js
// Gestion de la sélection d’un maillage et de l’application de textures + normales
// -----------------------------------------------------------------------------

import { createMesh } from '../../viewer/viewer.js';
import {
  getScene,
  getMeshes,
  getCurrentMesh,
  setCurrentMesh
} from '../../utils/sceneState.js';
import { toggleEdges } from '../../viewer/viewer.js';
import { updateInfoPanel } from '../../utils/sceneState.js';
import { applyNormalsToMesh } from '../../viewer/utilsNormals.js';
import { refreshMeshAssets } from '../../utils/refreshMeshAssets.js';

// -----------------------------------------------------------------------------
// API publique : initialisation des listeners des listes déroulantes
// -----------------------------------------------------------------------------
export function bindMeshSelection() {
  const meshSelect   = document.getElementById('mesh-list');
  const normalSelect = document.getElementById('normal-list');

  const scene  = getScene();
  const meshes = getMeshes();

  // ---------------------------------------------------------------------------
  // Changement de maillage ---------------------------------------------------
  meshSelect?.addEventListener('change', async () => {
    const selectedPath = meshSelect.value;
    if (!selectedPath) return;

    try {
      // 1. Récupération du maillage auprès de l’API backend
      const res = await fetch('http://localhost:8000/api/load-mesh-from-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selectedPath })
      });

      const meshData = await res.json();
      if (meshData.error) {
        console.error('Erreur backend:', meshData.error);
        return;
      }

      // 2. Retire le mesh courant de la scène
      const currentMesh = getCurrentMesh();
      if (currentMesh) scene.remove(currentMesh);

      // 3. Ajoute les métadonnées locales au mesh
      const selectedMesh = meshes.find(m => m.path === selectedPath);
      const enriched = {
        ...meshData,
        id:   selectedMesh?.id,
        name: selectedMesh?.name,
        path: selectedMesh?.path
      };

      const newMesh = createMesh(enriched);
      newMesh.userData.meta = selectedMesh;
      scene.add(newMesh);

      // 4. Désactive les arêtes par défaut
      const edgeToggle = document.getElementById('edges-toggle');
      if (edgeToggle) edgeToggle.checked = false;
      toggleEdges(newMesh, scene, false);

      // 5. Met à jour l’état global
      setCurrentMesh(newMesh);
      await refreshMeshAssets(newMesh.userData.meta);
      updateTextureListForSelectedMesh(selectedMesh);

      // 6. Panneau d’informations
      updateInfoPanel({
        mesh: newMesh,
        meshMeta: newMesh.userData.meta,
        texture: null,
        textureMeta: null
      });
    } catch (err) {
      console.error('Erreur chargement mesh:', err);
    }
  });

  // ---------------------------------------------------------------------------
  //  Changement de fichier CSV de normales -----------------------------------
  normalSelect?.addEventListener('change', () => {
    const csvPath = normalSelect.value;
    if (!csvPath) return;

    const mesh = getCurrentMesh();
    const scene = getScene();
    applyNormalsToMesh(mesh, csvPath, scene)
      .catch(err => console.error('applyNormalsToMesh:', err));
  });
}

// -----------------------------------------------------------------------------
// Helpers : reconstruisent les listes « Texture » et « Normals » du mesh courant
// -----------------------------------------------------------------------------

/**
 * Renvoie un libellé lisible : d’abord .name ou .label, sinon basename(path).
 */
const labelOf = asset => {
  if (typeof asset === 'string') return asset.split(/[\\/]/).pop();
  return asset.name || asset.label || (asset.path || '').split(/[\\/]/).pop();
};

/**
 * Remplit #texture-list à partir de meta.textures (array d’obj ou strings).
 * Conserve la sélection si elle existe encore.
 */
export function updateTextureListForSelectedMesh(meta) {
  const sel = document.getElementById('texture-list');
  if (!sel) return;

  const prev = sel.value;             // mémorise la sélection courante
  sel.innerHTML = '';

  const textures = meta?.textures || [];
  if (!textures.length) {
    sel.innerHTML = '<option>-- Aucune texture --</option>';
    sel.dispatchEvent(new Event('change'));
    return;
  }

  textures.forEach(tex => {
    const opt = document.createElement('option');
    opt.value = typeof tex === 'string' ? tex : tex.path;
    opt.textContent = labelOf(tex);
    sel.appendChild(opt);
  });

  // restaure la sélection si possible, sinon première valeur
  sel.value = textures.some(tex =>
              (typeof tex === 'string' ? tex : tex.path) === prev) ? prev : sel.options[0].value;
  sel.dispatchEvent(new Event('change'));
}

/**
 * Remplit #normal-list à partir de meta.normals (array d’obj ou strings).
 * Conserve la sélection si elle existe encore.
 */
export function updateNormalListForSelectedMesh(meta) {
  const sel = document.getElementById('normal-list');
  if (!sel) return;

  const prev = sel.value;
  sel.innerHTML = '';

  const normals = meta?.normals || [];
  if (!normals.length) {
    sel.innerHTML = '<option>-- Aucune normale --</option>';
    sel.dispatchEvent(new Event('change'));
    return;
  }

  normals.forEach(nrm => {
    const opt = document.createElement('option');
    opt.value = typeof nrm === 'string' ? nrm : nrm.path;
    opt.textContent = labelOf(nrm);
    sel.appendChild(opt);
  });

  sel.value = normals.some(nrm =>
              (typeof nrm === 'string' ? nrm : nrm.path) === prev) ? prev : sel.options[0].value;
  sel.dispatchEvent(new Event('change'));
}

