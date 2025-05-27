// main.js
import {
  setupScene,
  createMesh,
  startRenderingLoop,
  setWireframe,
  toggleEdges
} from './viewer.js';
import { applyColormap, getColormapType } from './colormap.js';
import { initColormapEditor } from './colormapEditor.js';
import { initDrawTool } from './draw.js';
import { showStatus } from './utils.js';
import Plotly from 'plotly.js-dist-min';
import './style.css';
import * as THREE from 'three';
import { initLoadModal } from './loadModal.js';
import { initTextureModal } from './textureModal.js';


let meshes = []; // Array of { id, name, meshObject, scalars }
let selectedMeshIndex = null;
let scene, camera;
let scalarMin = 0, scalarMax = 1;
let currentColormap = 'viridis';


document.addEventListener('DOMContentLoaded', () => {
  setupApp();
  setupUI();
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
  setupCurvatureComputation();

  initLoadModal((importedFiles) => {
    importedFiles.forEach(data => {
      const meshObject = createMesh(data);
      meshes.push({ id: data.id || data.name, name: data.name, meshObject, scalars: null });
    });
    updateMeshList();
  });

  initTextureModal(meshes, async (textures) => {
  const texturePaths = textures.map(t => t.path);

  const res = await fetch("http://localhost:8000/api/load-texture-paths", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paths: texturePaths })
  });

  const data = await res.json();

  data.forEach((t, i) => {
    if (meshes[i]) {
      meshes[i].scalars = t.scalars;
    }
  });

  updateSelectedMesh();
  showStatus("Textures appliquées avec succès");
});

}


function setupAccordion() {
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const acc = header.parentElement;
      acc.classList.toggle('open');
    });
  });
}


function updateMeshList() {
  const meshSelect = document.getElementById('mesh-list');
  meshSelect.innerHTML = '';

  meshes.forEach((m, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = m.name;
    meshSelect.appendChild(opt);
  });

  meshSelect.addEventListener('change', e => {
    selectedMeshIndex = parseInt(e.target.value);
    updateSelectedMesh();
  });
}

function updateSelectedMesh() {
  if (selectedMeshIndex === null) return;

  scene.clear();
  const mesh = meshes[selectedMeshIndex];
  scene.add(mesh.meshObject);

  if (mesh.scalars) {
    scalarMin = Math.min(...mesh.scalars);
    scalarMax = Math.max(...mesh.scalars);
    updateMeshColors(mesh.meshObject, mesh.scalars, currentColormap, scalarMin, scalarMax);
    updateColorbar(scalarMin, scalarMax, currentColormap);
    drawHistogram(mesh.scalars, currentColormap);
  }
}

function setupVisualizationSection() {
  const colormapSelect = document.getElementById('colormap-select');
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

function updateColorbar(min, max, cmap) {
  // identique à ta version actuelle
}

function drawHistogram(values, cmap, min = scalarMin, max = scalarMax) {
  // identique à ta version actuelle
}

function setupCurvatureComputation() {
  const btn = document.getElementById('compute-curvature');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const selected = meshes.map(m => m.id);
    const formData = new FormData();
    selected.forEach(id => formData.append('mesh_ids', id));

    showStatus("Calcul de la courbure...");

    const res = await fetch("http://localhost:8000/api/compute-curvature", {
      method: "POST",
      body: formData
    });

    const results = await res.json();
    results.forEach(result => {
      const mesh = meshes.find(m => m.id === result.id);
      if (mesh) {
        mesh.scalars = result.scalars;
      }
    });

    updateSelectedMesh();
    showStatus("Courbure calculée avec succès");
  });
}


