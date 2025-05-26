import { setupScene, createMesh, startRenderingLoop, setWireframe, toggleEdges } from './viewer.js';
import { applyColormap, getColormapType } from './colormap.js';
import { initColormapEditor } from './colormapEditor.js';
import { initDrawTool } from './draw.js';
import Plotly from 'plotly.js-dist-min';
import './style.css';
import * as THREE from 'three';

let currentMesh = null;
let data = {};
let scene, camera;
let scalarMin = 0, scalarMax = 1;
let currentColormap = 'viridis';

document.addEventListener('DOMContentLoaded', () => {
  setupApp();
  setupUI();
  setupAccordion();

  setupMeshUpload();
  setupTextureUpload();
});

// ------------------------------
// SETUP INITIAL DE LA SCENE
// ------------------------------
function setupApp() {
  const setup = setupScene();
  scene = setup.scene;
  camera = setup.camera;

  const setBackgroundColor = setup.setBackgroundColor;
  const bgInput = document.getElementById('bg-color-picker');
  if (bgInput && setBackgroundColor) {
    setBackgroundColor(bgInput.value);
    bgInput.addEventListener('input', () => {
      setBackgroundColor(bgInput.value);
    });
  }

  startRenderingLoop(scene, camera);
}

// ------------------------------
// UI : ACCORDIONS
// ------------------------------
function setupAccordion() {
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const acc = header.parentElement;
      acc.classList.toggle('open');
    });
  });
}

// ------------------------------
// CHARGEMENT DE MESH
// ------------------------------
function setupMeshUpload() {
  const meshInput = document.getElementById('mesh-input');
  meshInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("http://localhost:8000/api/upload-mesh", {method: "POST", body: formData});

    const meshData = await res.json();
    data.mesh = meshData;

    if (currentMesh) scene.remove(currentMesh);

    currentMesh = createMesh(data.mesh); 
    scene.add(currentMesh);

    initDrawTool({
      mesh: currentMesh,
      container: document.getElementById('viewer-container'),
      camera,
      scene,
      renderer: null
    });
  });
}

// ------------------------------
// CHARGEMENT DE TEXTURE
// ------------------------------
function setupTextureUpload() {
  const textureInput = document.getElementById('texture-input');
  textureInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("http://localhost:8000/api/upload-texture", {
      method: "POST",
      body: formData
    });

    const json = await res.json();
    data.scalars = json.scalars;

    scalarMin = Math.min(...data.scalars);
    scalarMax = Math.max(...data.scalars);

    document.getElementById('min-val').value = scalarMin.toFixed(2);
    document.getElementById('max-val').value = scalarMax.toFixed(2);

    updateMeshColors(currentMesh, data.scalars, currentColormap, scalarMin, scalarMax);
    updateColorbar(scalarMin, scalarMax, currentColormap);
    drawHistogram(data.scalars, currentColormap, scalarMin, scalarMax);


    initColormapEditor(data, scalarMin, scalarMax, (colors) => {
      const attr = currentMesh.geometry.getAttribute('color');
      if (attr) {
        attr.array.set(colors);
        attr.needsUpdate = true;
      } else {
        currentMesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      }
    });
  });
}

// ------------------------------
// UI INTERACTIONS
// ------------------------------
function setupUI() {
  const colormapSelect = document.getElementById('colormap-select');
  const wireframeToggle = document.getElementById('wireframe');
  const edgesToggle = document.getElementById('edges-toggle');
  const edgeColorInput = document.getElementById('edge-color');
  const edgeWidthInput = document.getElementById('edge-width');
  const minInput = document.getElementById('min-val');
  const maxInput = document.getElementById('max-val');
  const applyBtn = document.getElementById('apply-range');
  const textureToggle = document.getElementById('toggle-texture');

  const getColorMapRange = () => ({
    min: parseFloat(minInput.value),
    max: parseFloat(maxInput.value)
  });

  const updateEdges = () => {
    const color = edgeColorInput.value;
    const linewidth = parseFloat(edgeWidthInput.value);
    const show = edgesToggle.checked;
    toggleEdges(currentMesh, scene, show, { color, linewidth });
  };

  colormapSelect.addEventListener('change', () => {
    const cmap = colormapSelect.value;
    currentColormap = cmap;

    const { min, max } = getColorMapRange();
    updateMeshColors(currentMesh, data.scalars, currentColormap, scalarMin, scalarMax);

    updateColorbar(min, max, cmap);
    drawHistogram(data.scalars, cmap, min, max);
  });

  wireframeToggle.addEventListener('change', (e) => {
    setWireframe(currentMesh, e.target.checked);
  });

  edgesToggle.addEventListener('change', updateEdges);
  edgeColorInput.addEventListener('input', updateEdges);
  edgeWidthInput.addEventListener('input', updateEdges);

  applyBtn.addEventListener('click', () => {
    const cmap = colormapSelect.value;
    const minVal = parseFloat(minInput.value);
    const maxVal = parseFloat(maxInput.value);

    if (!isNaN(minVal) && !isNaN(maxVal) && minVal < maxVal) {
      updateMeshColors(currentMesh, data.scalars, cmap, minVal, maxVal);

      updateColorbar(minVal, maxVal, cmap);
      drawHistogram(data.scalars, cmap, minVal, maxVal);
    } else {
      alert("Veuillez entrer un min et un max valides (min < max).");
    }
  });

  minInput.value = scalarMin.toFixed(2);
  maxInput.value = scalarMax.toFixed(2);

  if (textureToggle) {
    textureToggle.addEventListener('change', () => {
      const useTexture = textureToggle.checked;
      const material = currentMesh.material;

      material.vertexColors = useTexture;
      if (!useTexture) {
        material.color.set(0xcccccc);
      }

      material.needsUpdate = true;
    });
  }
}

// ------------------------------
// COLOR + HISTOGRAM
// ------------------------------
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

function getBackgroundColorFromCanvas(ranges) {
  const usedColor = document.getElementById('background-color')?.value;
  if (usedColor) return usedColor;
  return '#808080';
}
