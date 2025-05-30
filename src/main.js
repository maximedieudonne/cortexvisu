// main.js
import {setupScene,startRenderingLoop, createMesh} from './viewer.js';
import { applyColormap} from './colormap.js';
import './style.css';
import * as THREE from 'three';
import { initLoadModal } from './loadModal.js';


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
  setupMeshUpload()
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
  initLoadModal()
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



function setupAccordion() {
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const acc = header.parentElement;
      acc.classList.toggle('open');
    });
  });
}


function setupVisualizationSection() {
  const colormapSelect = document.getElementById('colormap-select');
  const meshSelect = document.getElementById('mesh-list');

  colormapSelect.addEventListener('change', () => {
    currentColormap = colormapSelect.value;
    if (selectedMeshIndex !== null) {
      const mesh = meshes[selectedMeshIndex];
      updateMeshColors(mesh.meshObject, mesh.scalars, currentColormap, scalarMin, scalarMax);
      updateColorbar(scalarMin, scalarMax, currentColormap);
      drawHistogram(mesh.scalars, currentColormap);
    }
  });



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

  
}


