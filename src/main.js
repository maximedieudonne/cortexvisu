// main.js
import {setupScene,startRenderingLoop, createMesh} from './viewer.js';
import { applyColormap, getColormapType } from './colormap.js';
import { initColormapEditor } from './colormapEditor.js';
import { initDrawTool } from './draw.js';
import './style.css';
import * as THREE from 'three';
import { initLoadModal } from './loadModal.js';
import { initTextureModal } from './textureModal.js';
import { showStatus } from './utils.js';
import Plotly from 'plotly.js-dist-min';


let meshes = []; // Array of { id, name, meshObject, scalars}
let selectedMeshIndex = null;
let scene, camera;
let scalarMin = 0, scalarMax = 1;
let currentColormap = 'viridis';

let data = {}; // debug
let currentMesh = null;//debug

document.addEventListener('DOMContentLoaded', () => {
  setupApp();
  setupUI();
  setupMeshUpload();
});

function setupApp() {
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

function setupUI() {
  setupAccordion();
  setupVisualizationSection();
  initLoadModal(meshes);
  initTextureModal(meshes, updateTextureListForSelectedMesh);
  setupTextureSelection(); 
}


// -----------------------------
// CHARGEMENT DE MESH
// -----------------------------
function setupMeshUpload() {
  const meshSelect = document.getElementById('mesh-list');

  meshSelect.addEventListener('change', async () => {
    const selectedId = meshSelect.value;
    if (!selectedId) return;

    try {
      const res = await fetch("http://localhost:8000/api/load-mesh-from-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: selectedId }) // on envoie l'ID qui est en fait le chemin
      });

      const meshData = await res.json();

      if (meshData.error) {
        console.error("Erreur backend:", meshData.error);
        return;
      }

      data.mesh = meshData;

      if (currentMesh) scene.remove(currentMesh);

      currentMesh = createMesh(meshData); 
      scene.add(currentMesh);
    } catch (error) {
      console.error("Erreur lors du chargement du mesh:", error);
    }
  });
}

// -----------------------------
// CHARGEMENT DE LA TEXTURE
// -----------------------------

function setupTextureSelection() {
  const textureSelect = document.getElementById("texture-list");

  textureSelect.addEventListener("change", async (e) => {
    const selectedTexturePath = e.target.value;
    if (!selectedTexturePath || !currentMesh) return;

    try {
      const res = await fetch("http://localhost:8000/api/upload-texture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texture_paths: [selectedTexturePath] })
      });

      const result = await res.json();

      if (!Array.isArray(result) || !result[0]?.json) {
        throw new Error("Format de réponse inattendu");
      }

      const textureJsonPath = `/public/textures/${result[0].json}`;
      const jsonRes = await fetch(textureJsonPath);
      const jsonData = await jsonRes.json();

      const scalars = jsonData.scalars;
      data.scalars = scalars;

      scalarMin = Math.min(...scalars);
      scalarMax = Math.max(...scalars);

      document.getElementById('min-val').value = scalarMin.toFixed(2);
      document.getElementById('max-val').value = scalarMax.toFixed(2);

      updateMeshColors(currentMesh, scalars, currentColormap, scalarMin, scalarMax);
      currentMesh.material.vertexColors = true;
      currentMesh.material.needsUpdate = true;
      updateColorbar(scalarMin, scalarMax, currentColormap);
      drawHistogram(scalars, currentColormap, scalarMin, scalarMax);

      initColormapEditor(data, scalarMin, scalarMax, (colors) => {
        const attr = currentMesh.geometry.getAttribute('color');
        if (attr) {
          attr.array.set(colors);
          attr.needsUpdate = true;
        } else {
          currentMesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        }
      });

    } catch (err) {
      console.error("Erreur lors du chargement de la texture :", err);
      showStatus("Échec du chargement de la texture", true);
    }
  });
}





// -----------------------------
// CHARGEMENT DU MENU
// -----------------------------
function setupAccordion() {
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const acc = header.parentElement;
      acc.classList.toggle('open');
    });
  });
}


// -----------------------------
// FONCTIONS
// -----------------------------
function updateTextureListForSelectedMesh(mesh) {
  const textureSelect = document.getElementById("texture-list");
  textureSelect.innerHTML = '';

  if (!mesh || !mesh.textures || mesh.textures.length === 0) {
    const opt = document.createElement("option");
    opt.textContent = "-- Aucune texture --";
    textureSelect.appendChild(opt);
    return;
  }

  mesh.textures.forEach((tex, i) => {
    const opt = document.createElement("option");
    opt.value = tex.path;
    opt.textContent = tex.name;
    textureSelect.appendChild(opt);
  });

  textureSelect.selectedIndex = 0;
  textureSelect.dispatchEvent(new Event('change'));
  
}

function updateMeshColors(mesh, scalars, cmap, min, max) {
  const newColors = applyColormap(scalars, cmap, min, max);
  const colorAttr = mesh.geometry.getAttribute('color');
  if (colorAttr) {
    colorAttr.array.set(newColors);
    colorAttr.needsUpdate = true;
  } else {
    mesh.geometry.setAttribute('color', new THREE.BufferAttribute(newColors, 3));
  }
}


function updateColorbar(min, max, cmap = 'viridis') {
  const canvas = document.getElementById('colorbar-canvas');
  const ctx = canvas.getContext('2d');
  const h = canvas.height;

  document.getElementById('colorbar-discrete-tick-lines').style.display = 'none';
  document.getElementById('colorbar-tick-lines').style.display = 'flex';

  if (getColormapType(cmap) === 'discrete') return updateColorbarDiscrete(cmap);

  for (let y = 0; y < h; y++) {
    const t = y / h;
    const [r, g, b] = applyColormap([t], cmap, 0, 1);
    ctx.fillStyle = `rgb(${Math.floor(r * 255)}, ${Math.floor(g * 255)}, ${Math.floor(b * 255)})`;
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

function drawHistogram(values, cmapName, dynamicMin = scalarMin, dynamicMax = scalarMax) {
  if (getColormapType(cmapName) === 'discrete') return drawHistogramDiscrete(values, cmapName);

  const nbins = 50;
  const binWidth = (scalarMax - scalarMin) / nbins;
  const bins = new Array(nbins).fill(0);
  values.forEach(v => {
    const index = Math.floor((v - scalarMin) / binWidth);
    if (index >= 0 && index < nbins) bins[index]++;
  });

  const binCenters = bins.map((_, i) => scalarMin + binWidth * (i + 0.5));
  const colorTriplets = applyColormap(
    binCenters.map(v => Math.min(Math.max(v, dynamicMin), dynamicMax)),
    cmapName,
    dynamicMin,
    dynamicMax
  );

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
    xaxis: { title: 'Valeur scalaire', range: [scalarMin, scalarMax] },
    yaxis: { title: 'Fréquence' },
    bargap: 0.05,
    showlegend: false
  }, { staticPlot: false });
}

function drawHistogramDiscrete(values, cmapName) {
  const stored = localStorage.getItem('customColormap:' + cmapName);
  if (!stored) return;

  const ranges = JSON.parse(stored);
  const bgColor = getBackgroundColorFromCanvas(ranges);
  const bins = new Array(ranges.length + 1).fill(0);

  for (const v of values) {
    let found = false;
    for (let i = 0; i < ranges.length; i++) {
      if (v >= ranges[i].min && v <= ranges[i].max) {
        bins[i]++;
        found = true;
        break;
      }
    }
    if (!found) bins[ranges.length]++;
  }

  const xLabels = [...ranges.map(r => `${r.min.toFixed(1)}–${r.max.toFixed(1)}`), 'fond'];
  const colors = [...ranges.map(r => r.color), bgColor];

  Plotly.newPlot('histogram-container', [{
    x: xLabels,
    y: bins,
    type: 'bar',
    marker: { color: colors },
    hoverinfo: 'x+y'
  }], {
    margin: { t: 10, r: 10, b: 40, l: 40 },
    xaxis: { title: 'Tranche scalaire' },
    yaxis: { title: 'Fréquence' },
    bargap: 0.05,
    showlegend: false
  }, { staticPlot: false });
}


function updateColorbarDiscrete(cmapName) {
  const canvas = document.getElementById('colorbar-canvas');
  const ctx = canvas.getContext('2d');
  const h = canvas.height;
  const ranges = JSON.parse(localStorage.getItem('customColormap:' + cmapName));
  if (!ranges) return;

  for (const r of ranges) {
    const yStart = h * (1 - (r.max - scalarMin) / (scalarMax - scalarMin));
    const yEnd = h * (1 - (r.min - scalarMin) / (scalarMax - scalarMin));
    ctx.fillStyle = r.color;
    ctx.fillRect(0, yStart, canvas.width, yEnd - yStart);
  }

  const tickCont = document.getElementById('colorbar-tick-lines');
  const tickDiscrete = document.getElementById('colorbar-discrete-tick-lines');
  tickCont.style.display = 'none';
  tickDiscrete.innerHTML = '';
  tickDiscrete.style.display = 'block';

  const added = new Set();
  for (const r of ranges) {
    [r.min, r.max].forEach(v => {
      const y = h * (1 - (v - scalarMin) / (scalarMax - scalarMin));
      if (!added.has(v)) {
        const tick = document.createElement('div');
        tick.className = 'colorbar-tick';
        tick.style.top = `${y}px`;
        tick.innerHTML = `<span>${v.toFixed(2)}</span>`;
        tickDiscrete.appendChild(tick);
        added.add(v);
      }
    });
  }
}



function setupVisualizationSection() {
  const colormapSelect = document.getElementById('colormap-select');
  const meshSelect = document.getElementById('mesh-list');

  document.getElementById("mesh-list")?.addEventListener("change", (e) => {
  const selectedPath = e.target.value;
  const selectedMesh = meshes.find(m => m.path === selectedPath);
  updateTextureListForSelectedMesh(selectedMesh);
  });

  colormapSelect.addEventListener('change', () => {
    currentColormap = colormapSelect.value;
    if (selectedMeshIndex !== null) {
      const mesh = meshes[selectedMeshIndex];
      updateMeshColors(mesh.meshObject, mesh.scalars, currentColormap, scalarMin, scalarMax);
      updateColorbar(scalarMin, scalarMax, currentColormap);
      drawHistogram(mesh.scalars, currentColormap);
    }
  });

  
}


