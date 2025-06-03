import { getCurrentMesh } from '../../utils/sceneState.js';
import { updateMeshColors, updateColorbar, drawHistogram } from '../coloring.js';

export function bindColormapSelection() {
  const colormapSelect = document.getElementById('colormap-select');
  const minInput = document.getElementById('min-val');
  const maxInput = document.getElementById('max-val');

  colormapSelect?.addEventListener('change', () => {
    const currentMesh = getCurrentMesh();
    if (!currentMesh) return;

    const scalars = currentMesh.userData?.scalars || [];
    const minVal = parseFloat(minInput.value);
    const maxVal = parseFloat(maxInput.value);
    const cmap = colormapSelect.value;

    if (!isNaN(minVal) && !isNaN(maxVal) && minVal < maxVal) {
      updateMeshColors(currentMesh, scalars, cmap, minVal, maxVal);
      updateColorbar(minVal, maxVal, cmap);
      drawHistogram(scalars, cmap, minVal, maxVal);
    }
  });
}
