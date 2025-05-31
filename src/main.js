// main.js
import { setupScene, startRenderingLoop, createMesh } from './viewer.js';
import { applyColormap, getColormapType } from './colormap.js';
import { initColormapEditor } from './colormapEditor.js';
import { initLoadModal } from './loadModal.js';
import { initTextureModal } from './textureModal.js';
import { showStatus } from './utils.js';
import Plotly from 'plotly.js-dist-min';
import './style.css';
import * as THREE from 'three';

let meshes = [];
let currentMesh = null;
let scene, camera;
let scalarMin = 0, scalarMax = 1;
let currentColormap = 'viridis';

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  setupSceneAndRendering();
  bindUIEvents();
  initModals();
}

function setupSceneAndRendering() {
  const setup = setupScene();
  scene = setup.scene;
  camera = setup.camera;

  const bgInput = document.getElementById('bg-color-picker');
  if (bgInput) {
    setup.setBackgroundColor(bgInput.value);
    bgInput.addEventListener('input', () => {
      setup.setBackgroundColor(bgInput.value);
    });
  }

  startRenderingLoop(scene, camera);
}

function initModals() {
  initLoadModal(meshes);
  initTextureModal(meshes, updateTextureListForSelectedMesh);
}

function bindUIEvents() {
  setupAccordion();
  bindMeshSelection();
  bindTextureSelection();
  bindColormapSelection();
}

function setupAccordion() {
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const acc = header.parentElement;
      acc.classList.toggle('open');
    });
  });
}

function bindMeshSelection() {
  const meshSelect = document.getElementById('mesh-list');
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

      if (currentMesh) scene.remove(currentMesh);
      currentMesh = createMesh(meshData);
      scene.add(currentMesh);

      const selectedMesh = meshes.find(m => m.path === selectedPath);
      updateTextureListForSelectedMesh(selectedMesh);

    } catch (error) {
      console.error("Erreur chargement mesh:", error);
    }
  });
}

function bindTextureSelection() {
  const textureSelect = document.getElementById('texture-list');

  textureSelect?.addEventListener('change', async (e) => {
    const selectedTexturePath = e.target.value;
    if (!selectedTexturePath || !currentMesh) return;

    try {
      const res = await fetch("http://localhost:8000/api/upload-texture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texture_paths: [selectedTexturePath] })
      });

      const result = await res.json();
      if (!result[0]?.json) throw new Error("Réponse backend invalide");

      const textureJsonPath = `/public/textures/${result[0].json}`;
      const jsonData = await (await fetch(textureJsonPath)).json();

      const scalars = jsonData.scalars;
      scalarMin = Math.min(...scalars);
      scalarMax = Math.max(...scalars);

      currentMesh.userData.scalars = scalars;

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

    } catch (err) {
      console.error("Erreur chargement texture :", err);
      showStatus("Erreur lors du chargement de la texture", true);
    }
  });
}

function bindColormapSelection() {
  const colormapSelect = document.getElementById('colormap-select');

  colormapSelect?.addEventListener('change', () => {
    currentColormap = colormapSelect.value;
    if (!currentMesh) return;
    const scalars = currentMesh.userData?.scalars || [];
    updateMeshColors(currentMesh, scalars, currentColormap, scalarMin, scalarMax);
    updateColorbar(scalarMin, scalarMax, currentColormap);
    drawHistogram(scalars, currentColormap);
  });
}

function updateTextureListForSelectedMesh(mesh) {
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

function updateMeshColors(mesh, scalars, cmap, min, max) {
  const geometry = mesh.geometry;
  const newColors = applyColormap(scalars, cmap, min, max);

  if (scalars.length !== geometry.attributes.position.count) {
    console.warn("Le nombre de scalaires ne correspond pas au nombre de sommets !");
    return;
  }

  const colorAttr = geometry.getAttribute('color');

  if (colorAttr) {
    colorAttr.array.set(newColors);
    colorAttr.needsUpdate = true;
  } else {
    geometry.setAttribute('color', new THREE.BufferAttribute(newColors, 3));
  }

  // Force update si nécessaire
  mesh.material.vertexColors = true;
  mesh.material.needsUpdate = true;
}


function updateColorbar(min, max, cmap) {
  const canvas = document.getElementById('colorbar-canvas');
  const ctx = canvas.getContext('2d');
  const h = canvas.height;

  document.getElementById('colorbar-discrete-tick-lines').style.display = 'none';
  document.getElementById('colorbar-tick-lines').style.display = 'flex';

  if (getColormapType(cmap) === 'discrete') return;

  for (let y = 0; y < h; y++) {
    const t = y / h;
    const [r, g, b] = applyColormap([t], cmap, 0, 1);
    ctx.fillStyle = `rgb(${r * 255}, ${g * 255}, ${b * 255})`;
    ctx.fillRect(0, h - y, canvas.width, 1);
  }

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

function drawHistogram(values, cmapName, min = scalarMin, max = scalarMax) {
  const nbins = 50;
  const binWidth = (max - min) / nbins;
  const bins = new Array(nbins).fill(0);

  values.forEach(v => {
    const index = Math.floor((v - min) / binWidth);
    if (index >= 0 && index < nbins) bins[index]++;
  });

  const binCenters = bins.map((_, i) => min + binWidth * (i + 0.5));
  const colorTriplets = applyColormap(binCenters.map(v => Math.min(Math.max(v, min), max)), cmapName, min, max);

  const colors = [];
  for (let i = 0; i < binCenters.length; i++) {
    const r = Math.floor(colorTriplets[i * 3] * 255);
    const g = Math.floor(colorTriplets[i * 3 + 1] * 255);
    const b = Math.floor(colorTriplets[i * 3 + 2] * 255);
    colors.push(`rgb(${r},${g},${b})`);
  }

  Plotly.newPlot('histogram-container', [{
    x: binCenters,
    y: bins,
    type: 'bar',
    marker: { color: colors },
    hoverinfo: 'x+y'
  }], {
    margin: { t: 10, r: 10, b: 40, l: 40 },
    xaxis: { title: 'Valeur scalaire', range: [min, max] },
    yaxis: { title: 'Fréquence' },
    bargap: 0.05,
    showlegend: false
  }, { staticPlot: false });
}
