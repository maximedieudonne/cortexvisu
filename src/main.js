import { setupScene, createMesh, startRenderingLoop, setWireframe, toggleEdges } from './viewer.js';
import { applyColormap, getColormapType } from './colormap.js';
import { initColormapEditor } from './colormapEditor.js';
import Plotly from 'plotly.js-dist-min';
import './style.css';

let currentMesh = null;
let data = null;
let scene, camera;
let scalarMin, scalarMax;
let currentColormap = 'viridis';

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

      currentMesh = createMesh(data, currentColormap, scalarMin, scalarMax);
      scene.add(currentMesh);

      updateColorbar(scalarMin, scalarMax, currentColormap);
      drawHistogram(data.scalars, currentColormap, scalarMin, scalarMax);

      setupUI();
      initColormapEditor(data, scalarMin, scalarMax, (colors) => {
        const attr = currentMesh.geometry.getAttribute('color');
        if (attr) {
          attr.array.set(colors);
          attr.needsUpdate = true;
        } else {
          currentMesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        }
      });

      startRenderingLoop(scene, camera);
    })
    .catch(err => {
      console.error('Erreur de chargement des données :', err);
      const titleElement = document.getElementById('title');
      if (titleElement) titleElement.textContent = `Erreur : ${err.message}`;
    });
});

function updateMeshColors(mesh, scalars, cmap, min = null, max = null) {
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
  // Affiche les ticks continus et cache ceux des discrets
  document.getElementById('colorbar-discrete-tick-lines').style.display = 'none';
  document.getElementById('colorbar-tick-lines').style.display = 'flex';
  const type = getColormapType(cmap);
  if (type === 'discrete') return updateColorbarDiscrete(cmap);

  const canvas = document.getElementById('colorbar-canvas');
  const ctx = canvas.getContext('2d');
  const h = canvas.height;

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

  // Colorier les bandes
  for (const r of ranges) {
    const yStart = h * (1 - (r.max - scalarMin) / (scalarMax - scalarMin));
    const yEnd = h * (1 - (r.min - scalarMin) / (scalarMax - scalarMin));
    ctx.fillStyle = r.color;
    ctx.fillRect(0, yStart, canvas.width, yEnd - yStart);
  }

  // Gérer les ticks
  const tickCont = document.getElementById('colorbar-tick-lines');
  const tickDiscrete = document.getElementById('colorbar-discrete-tick-lines');
  tickCont.style.display = 'none';
  tickDiscrete.innerHTML = '';
  tickDiscrete.style.display = 'block';

  const added = new Set(); // éviter les doublons
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
  const type = getColormapType(cmapName);
  if (type === 'discrete') return drawHistogramDiscrete(values, cmapName);

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
  const bgColor = getBackgroundColorFromCanvas(ranges); // utilitaire ci-dessous
  const bins = new Array(ranges.length + 1).fill(0); // +1 pour le background

  for (const v of values) {
    let found = false;
    for (let i = 0; i < ranges.length; i++) {
      if (v >= ranges[i].min && v <= ranges[i].max) {
        bins[i]++;
        found = true;
        break;
      }
    }
    if (!found) bins[ranges.length]++; // background bin
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

//  Utilitaire pour récupérer la couleur de fond appliquée dans le modal
function getBackgroundColorFromCanvas(ranges) {
  const usedColor = document.getElementById('background-color')?.value;
  if (usedColor) return usedColor;

  // fallback : couleur majoritaire dans les trous ?
  return '#808080';
}


function setupUI() {
  const colormapSelect = document.getElementById('colormap-select');
  const wireframeToggle = document.getElementById('wireframe');
  const edgesToggle = document.getElementById('edges-toggle');
  const edgeColorInput = document.getElementById('edge-color');
  const edgeWidthInput = document.getElementById('edge-width');
  const minInput = document.getElementById('min-val');
  const maxInput = document.getElementById('max-val');
  const applyBtn = document.getElementById('apply-range');

  if (!colormapSelect || !wireframeToggle || !minInput || !maxInput || !applyBtn) {
    console.warn('Certains éléments de l’interface sont manquants.');
    return;
  }

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
    updateMeshColors(currentMesh, data.scalars, cmap, min, max);
    updateColorbar(min, max, cmap);
    drawHistogram(data.scalars, cmap, min, max);
  });

  wireframeToggle.addEventListener('change', (e) => {
    setWireframe(currentMesh, e.target.checked);
  });

  edgesToggle?.addEventListener('change', updateEdges);
  edgeColorInput?.addEventListener('input', updateEdges);
  edgeWidthInput?.addEventListener('input', updateEdges);

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
}
