import { applyColormap, getColormapType } from '../viewer/colormap.js';
import * as THREE from 'three';

import { getScalarMinMax } from '../utils/sceneState.js';
import Plotly from 'plotly.js-dist-min';

export function updateMeshColors(mesh, scalars, cmap, min, max) {
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

  mesh.material.vertexColors = true;
  mesh.material.needsUpdate = true;
}


export function updateColorbar(min, max, cmap) {
  const canvas = document.getElementById('colorbar-canvas');
  const ctx = canvas.getContext('2d');
  const h = canvas.height;

  const isDiscrete = getColormapType(cmap) === 'discrete';
  document.getElementById('colorbar-discrete-tick-lines').style.display = isDiscrete ? 'block' : 'none';
  document.getElementById('colorbar-tick-lines').style.display = isDiscrete ? 'none' : 'flex';

  if (isDiscrete) {
    return updateColorbarDiscrete(cmap, min, max);
  }

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


export function updateColorbarDiscrete(cmapName, min, max) {
  const canvas = document.getElementById('colorbar-canvas');
  const ctx = canvas.getContext('2d');
  const h = canvas.height;
  const ranges = JSON.parse(localStorage.getItem('customColormap:' + cmapName));
  if (!ranges) return;

  for (const r of ranges) {
    const yStart = h * (1 - (r.max - min) / (max - min));
    const yEnd = h * (1 - (r.min - min) / (max - min));
    ctx.fillStyle = r.color;
    ctx.fillRect(0, yStart, canvas.width, yEnd - yStart);
  }

  const tickContainer = document.getElementById('colorbar-discrete-tick-lines');
  tickContainer.innerHTML = '';

  const seen = new Set();
  for (const r of ranges) {
    [r.min, r.max].forEach(val => {
      if (!seen.has(val)) {
        const y = h * (1 - (val - min) / (max - min));
        const tick = document.createElement('div');
        tick.className = 'colorbar-tick';
        tick.style.top = `${y}px`;
        tick.innerHTML = `<span>${val.toFixed(2)}</span>`;
        tickContainer.appendChild(tick);
        seen.add(val);
      }
    });
  }
}




export function drawHistogram(values, cmapName, dynamicMin, dynamicMax) {
  const { scalarMin: trueMin, scalarMax: trueMax } = getScalarMinMax();
  const nbins = 50;
  const binWidth = (trueMax - trueMin) / nbins;
  const bins = new Array(nbins).fill(0);

  values.forEach(v => {
    const index = Math.floor((v - trueMin) / binWidth);
    if (index >= 0 && index < nbins) bins[index]++;
  });

  const binCenters = bins.map((_, i) => trueMin + binWidth * (i + 0.5));

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
    xaxis: { title: 'Valeur scalaire', range: [trueMin, trueMax] },
    yaxis: { title: 'Fréquence' },
    bargap: 0.05,
    showlegend: false
  }, { staticPlot: false });
}

