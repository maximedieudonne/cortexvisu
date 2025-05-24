import { setupScene, createMesh, startRenderingLoop, setWireframe } from './viewer.js';
import { applyColormap } from './colormap.js';
import './style.css'; // Assure-toi que ce chemin correspond bien à ton projet

let currentMesh = null;
let data = null;
let scene, camera;
let scalarMin, scalarMax;

document.addEventListener('DOMContentLoaded', () => {
  fetch('/data.json')
    .then(res => res.json())
    .then(json => {
      data = json;
      const titleElement = document.getElementById('title');
      if (titleElement) titleElement.textContent = data.title || 'Cortex Viewer';

      const setup = setupScene();
      scene = setup.scene;
      camera = setup.camera;

      scalarMin = Math.min(...data.scalars);
      scalarMax = Math.max(...data.scalars);
      updateColorbar(scalarMin, scalarMax);

      currentMesh = createMesh(data, 'viridis');
      scene.add(currentMesh);

      setupUI();
      startRenderingLoop(scene, camera);
    })
    .catch(err => {
      console.error('Erreur de chargement des données :', err);
      const titleElement = document.getElementById('title');
      if (titleElement) titleElement.textContent = `Erreur : ${err.message}`;
    });
});

/**
 * Met à jour dynamiquement les couleurs du mesh
 */
function updateMeshColors(mesh, scalars, cmap, min = null, max = null) {
  const newColors = applyColormap(scalars, cmap, min, max);
  const colorAttr = mesh.geometry.getAttribute('color');
  colorAttr.array.set(newColors);
  colorAttr.needsUpdate = true;

  mesh.geometry.attributes.color.needsUpdate = true;
}

/**
 * Met à jour la colorbar HTML
 */
function updateColorbar(min, max, cmap = 'viridis') {
  const canvas = document.getElementById('colorbar-canvas');
  const ctx = canvas.getContext('2d');
  const h = canvas.height;

  // Dessin de la colormap
  for (let y = 0; y < h; y++) {
    const t = y / h;
    const [r, g, b] = applyColormap([t], cmap,0,1);
    ctx.fillStyle = `rgb(${Math.floor(r * 255)}, ${Math.floor(g * 255)}, ${Math.floor(b * 255)})`;
    ctx.fillRect(0, h - y, canvas.width, 1);
  }

  // Génération des ticks
  const ticksContainer = document.getElementById('colorbar-tick-lines');
  ticksContainer.innerHTML = '';

  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const value = max - (i / steps) * (max - min);
    const tick = document.createElement('div');
    tick.className = 'colorbar-tick';
    tick.innerHTML = `<span>${value.toFixed(2)}</span>`;
    ticksContainer.appendChild(tick);
  }
}


/**
 * Ajoute tous les écouteurs d'interface utilisateur
 */
function setupUI() {
  const colormapSelect = document.getElementById('colormap-select');
  const wireframeToggle = document.getElementById('wireframe');
  const minInput = document.getElementById('min-val');
  const maxInput = document.getElementById('max-val');
  const applyBtn = document.getElementById('apply-range');

  if (!colormapSelect || !wireframeToggle || !minInput || !maxInput || !applyBtn) {
    console.warn('❗ Certains éléments de l’interface sont manquants.');
    return;
  }

  colormapSelect.addEventListener('change', (e) => {
    const cmap = e.target.value;
    updateMeshColors(currentMesh, data.scalars, cmap, scalarMin, scalarMax);
    updateColorbar(scalarMin, scalarMax, cmap);
  });

  wireframeToggle.addEventListener('change', (e) => {
    setWireframe(currentMesh, e.target.checked);
  });

  applyBtn.addEventListener('click', () => {
    const cmap = colormapSelect.value;
    const minVal = parseFloat(minInput.value);
    const maxVal = parseFloat(maxInput.value);

    if (!isNaN(minVal) && !isNaN(maxVal) && minVal < maxVal) {
      updateMeshColors(currentMesh, data.scalars, cmap, minVal, maxVal);
      updateColorbar(minVal, maxVal, cmap);
    } else {
      alert("Veuillez entrer un min et un max valides (min < max).");
    }
  });

  minInput.value = scalarMin.toFixed(2);
  maxInput.value = scalarMax.toFixed(2);
}
