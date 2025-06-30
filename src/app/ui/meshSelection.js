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
  // ⬇️ Changement de fichier CSV de normales -----------------------------------
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
// FONCTIONS UTILITAIRES : mise à jour des listes déroulantes
// -----------------------------------------------------------------------------

export function updateTextureListForSelectedMesh(mesh) {
  const textureSelect = document.getElementById('texture-list');
  if (!textureSelect) return;

  textureSelect.innerHTML = '';
  if (!mesh?.textures?.length) {
    textureSelect.innerHTML = '<option>-- Aucune texture --</option>';
    return;
  }

  mesh.textures.forEach(tex => {
    const opt = document.createElement('option');
    opt.value = tex.path;
    opt.textContent = tex.name;
    textureSelect.appendChild(opt);
  });

  textureSelect.selectedIndex = 0;
  textureSelect.dispatchEvent(new Event('change'));
}

export function updateNormalListForSelectedMesh(mesh) {
  const normalSelect = document.getElementById('normal-list');
  if (!normalSelect) return;

  normalSelect.innerHTML = '';
  if (!mesh?.normals?.length) {
    normalSelect.innerHTML = '<option>-- Aucune normale --</option>';
    return;
  }

  mesh.normals.forEach(n => {
    const opt = document.createElement('option');
    opt.value = n.path;
    opt.textContent = n.name;
    normalSelect.appendChild(opt);
  });

  normalSelect.selectedIndex = 0;
  normalSelect.dispatchEvent(new Event('change'));
}
