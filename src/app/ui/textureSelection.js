import { getCurrentMesh, setScalarMinMax, getCurrentColormap } from '../../utils/sceneState.js';
import { updateMeshColors, updateColorbar, drawHistogram } from '../coloring.js';
import { showStatus } from '../../utils/utils.js';
import { initColormapEditor } from '../../viewer/colormapEditor.js';
import * as THREE from 'three';
import { updateInfoPanel } from '../../utils/sceneState.js';

export function bindTextureSelection() {
  const textureSelect = document.getElementById('texture-list');

  textureSelect?.addEventListener('change', async (e) => {
  const selectedTexturePath = e.target.value;
  const currentMesh = getCurrentMesh();

  if (!selectedTexturePath || selectedTexturePath === '-- Aucune texture --' || !currentMesh) {
    return;
  }

  try {
    const res = await fetch("http://localhost:8000/api/upload-texture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texture_paths: [selectedTexturePath] })
    });

      const result = await res.json();
      const responseItem = result[0];

      if (!responseItem || responseItem.error) {
        throw new Error(responseItem?.error || "Réponse backend invalide");
      }

      const scalars = responseItem.scalars;
      if (!Array.isArray(scalars) || scalars.length === 0) {
        console.error("Erreur : 'scalars' est vide ou invalide.");
        return;
      }

      const scalarMin = Math.min(...scalars);
      const scalarMax = Math.max(...scalars);
      setScalarMinMax(scalarMin, scalarMax);
      currentMesh.userData.scalars = scalars;

      const currentColormap = getCurrentColormap();

      updateMeshColors(currentMesh, scalars, currentColormap, scalarMin, scalarMax);
      updateColorbar(scalarMin, scalarMax, currentColormap);
      drawHistogram(scalars, currentColormap, scalarMin, scalarMax);

      document.getElementById('min-val').value = scalarMin.toFixed(2);
      document.getElementById('max-val').value = scalarMax.toFixed(2);

      initColormapEditor({ scalars }, scalarMin, scalarMax, (colors) => {
        const attr = currentMesh.geometry.getAttribute('color');
        if (attr) {
          attr.array.set(colors);
          attr.needsUpdate = true;
        } else {
          currentMesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        }
      });

      // Crée les métadonnées de la texture
      const textureMeta = {
        name: selectedTexturePath.split('/').pop(),
        path: selectedTexturePath,
        scalars
      };

      // Appelle la mise à jour du panneau d’infos
      updateInfoPanel({
        mesh: currentMesh,
        meshMeta: currentMesh.userData.meta,
        texture: true,
        textureMeta
      });

    } catch (err) {
      console.error("Erreur chargement texture :", err);
      showStatus("Erreur lors du chargement de la texture", true);
    }
  });
}


