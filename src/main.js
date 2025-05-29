// main.js
import {setupScene,startRenderingLoop,} from './viewer.js';
import { applyColormap} from './colormap.js';
import './style.css';
import * as THREE from 'three';
import { initLoadModal } from './loadModal.js';


let meshes = []; // Array of { id, name, meshObject, scalars}
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

  //initLoadModal((importedFiles) => {
   // importedFiles.forEach(data => {
    //  const meshObject = createMesh(data);
   //   meshes.push({ id: data.id || data.name, name: data.name, meshObject, scalars: null });
  //  });
  //  updateMeshList();
  //  meshes.forEach(updateTextureListForSelectedMesh);

  //});

  initLoadModal()

  //initTextureModal(
  //meshes,
  //async (textures) => {
  //  const texturePaths = textures.map(t => t.path);
  //  const res = await fetch("http://localhost:8000/api/load-texture-paths", {
  //    method: "POST",
  //    headers: { "Content-Type": "application/json" },
  //    body: JSON.stringify({ paths: texturePaths })
  //  });
  //  const data = await res.json();
  //  data.forEach((t, i) => {
  //    if (meshes[i]) {
  //      meshes[i].scalars = t.scalars;
  //    }
  //  });
  //  updateSelectedMesh();
  //  showStatus("Textures appliquées avec succès");
  //},
  //updateTextureListForSelectedMesh()
//);
}


function setupAccordion() {
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const acc = header.parentElement;
      acc.classList.toggle('open');
    });
  });
}


//function updateMeshList() {
//  const meshSelect = document.getElementById('mesh-list');
//  meshSelect.innerHTML = '';
//  meshes.forEach((m, i) => {
//    const opt = document.createElement('option');
//    opt.value = i;
//    opt.textContent = m.name;
//    meshSelect.appendChild(opt);
//  });
//  meshSelect.addEventListener('change', e => {
//    selectedMeshIndex = parseInt(e.target.value);
//    updateSelectedMesh();
//  });
//}


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


