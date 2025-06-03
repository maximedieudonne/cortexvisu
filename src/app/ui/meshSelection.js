import { createMesh } from '../../viewer/viewer.js';
import {
  getScene,
  getMeshes,
  getCurrentMesh,
  setCurrentMesh
} from '../../utils/sceneState.js';
import { toggleEdges } from '../../viewer/viewer.js';

export function bindMeshSelection() {
  const meshSelect = document.getElementById('mesh-list');
  const scene = getScene();
  const meshes = getMeshes();

  meshSelect?.addEventListener('change', async () => {
    const selectedPath = meshSelect.value;
    if (!selectedPath) return;

    try {
      const res = await fetch("http://localhost:8000/api/load-mesh-from-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: selectedPath })
      });

      const meshData = await res.json();
      if (meshData.error) return console.error("Erreur backend:", meshData.error);

      const currentMesh = getCurrentMesh();
      if (currentMesh) scene.remove(currentMesh);

      const newMesh = createMesh(meshData);
      scene.add(newMesh);

      const edgeToggle = document.getElementById('edges-toggle');
      if (edgeToggle) {
      edgeToggle.checked = false; 
        }

      toggleEdges(newMesh, scene, false);

      setCurrentMesh(newMesh);

      const selectedMesh = meshes.find(m => m.path === selectedPath);
      updateTextureListForSelectedMesh(selectedMesh);

    } catch (error) {
      console.error("Erreur chargement mesh:", error);
    }
  });
}


export function updateTextureListForSelectedMesh(mesh) {
  const textureSelect = document.getElementById("texture-list");
  textureSelect.innerHTML = '';

  if (!mesh || !mesh.textures || mesh.textures.length === 0) {
    const opt = document.createElement("option");
    opt.textContent = "-- Aucune texture --";
    textureSelect.appendChild(opt);
    return;
  }

  mesh.textures.forEach(tex => {
    const opt = document.createElement("option");
    opt.value = tex.path;
    opt.textContent = tex.name;
    textureSelect.appendChild(opt);
  });

  textureSelect.selectedIndex = 0;
  textureSelect.dispatchEvent(new Event('change'));
}


