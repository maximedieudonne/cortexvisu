import { getCurrentMesh, getScene } from '../../utils/sceneState.js';
import { applyNormalsToMesh } from '../../viewer/utilsNormals.js';
import { showStatus } from '../../utils/utils.js';

export function bindNormalSelection() {
  const normalSelect = document.getElementById('normal-list');
  if (!normalSelect) return;

  normalSelect.addEventListener('change', () => {
    const csvPath = normalSelect.value;
    const mesh = getCurrentMesh();
    const scene = getScene();

    if (!csvPath || csvPath.startsWith('--') || !mesh) return;

    applyNormalsToMesh(mesh, csvPath, scene)
      .catch(err => {
        console.error('Erreur injection normales :', err);
        showStatus('Erreur lors du chargement des normales', true);
      });
  });
}
