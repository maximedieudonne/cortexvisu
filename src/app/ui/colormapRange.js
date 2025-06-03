import { getCurrentMesh, getScalarMinMax } from '../../utils/sceneState.js';
import { updateMeshColors, updateColorbar, drawHistogram } from '../coloring.js';

export function bindColormapRangeControls() {
  const minInput = document.getElementById('min-val');
  const maxInput = document.getElementById('max-val');
  const applyBtn = document.getElementById('apply-range');
  const resetBtn = document.getElementById('reset-range');
  const colormapSelect = document.getElementById('colormap-select');

  if (!minInput || !maxInput || !applyBtn || !colormapSelect) return;

  applyBtn.addEventListener('click', () => {
    const currentMesh = getCurrentMesh();
    if (!currentMesh) return;

    const minVal = parseFloat(minInput.value);
    const maxVal = parseFloat(maxInput.value);
    const scalars = currentMesh.userData?.scalars || [];
    const cmap = colormapSelect.value;

    if (!isNaN(minVal) && !isNaN(maxVal) && minVal < maxVal) {
      updateMeshColors(currentMesh, scalars, cmap, minVal, maxVal);
      updateColorbar(minVal, maxVal, cmap);
      drawHistogram(scalars, cmap, minVal, maxVal);
    } else {
      alert("Veuillez entrer un min et un max valides (min < max).");
    }
  });

  resetBtn?.addEventListener('click', () => {
    const currentMesh = getCurrentMesh();
    if (!currentMesh) return;

    const scalars = currentMesh.userData?.scalars || [];
    const cmap = colormapSelect.value;
    const { scalarMin, scalarMax } = getScalarMinMax(); // ✅ à lire à ce moment précis

    minInput.value = scalarMin.toFixed(2);
    maxInput.value = scalarMax.toFixed(2);

    updateMeshColors(currentMesh, scalars, cmap, scalarMin, scalarMax);
    updateColorbar(scalarMin, scalarMax, cmap);
    drawHistogram(scalars, cmap, scalarMin, scalarMax);
  });
}
