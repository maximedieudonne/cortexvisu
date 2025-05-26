// draw.js
import * as THREE from 'three';

let brushColor = '#ff0000';
let brushSize = 1;
let isDrawing = false;
let drawModeActive = false;
let eraseMode = false;
let selectedTextureName = null;

let drawScalarsMap = {}; // { textureName: Float32Array }
let drawColorMap = {};   // { textureName: { [vertexIndex]: '#rrggbb' } }
let drawHistory = []; // historique des dessins
let drawStatusEl = null;
let brushPreview = null;

export function initDrawTool({ mesh, container, camera, scene, renderer }) {
  const textureSelect = document.getElementById('manual-texture-select');
  const colorInput = document.getElementById('brush-color');
  const sizeInput = document.getElementById('brush-size');
  const newTexBtn = document.getElementById('create-draw-texture-btn');
  const modal = document.getElementById('draw-modal');
  const nameInput = document.getElementById('draw-texture-name');
  const confirmBtn = document.getElementById('confirm-draw-texture');
  const cancelBtn = document.getElementById('cancel-draw-texture');
  const drawTools = document.getElementById('draw-tools');
  const exportBtn = document.createElement('button');

  exportBtn.textContent = 'Exporter JSON';
  exportBtn.addEventListener('click', () => {
    if (selectedTextureName) exportDrawTexture(selectedTextureName);
  });
  drawTools.appendChild(exportBtn);

  drawStatusEl = document.getElementById('draw-status-message');
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  if (textureSelect.options.length > 0) {
    drawTools.style.display = 'block';
  }

  newTexBtn.addEventListener('click', () => {
    nameInput.value = '';
    modal.classList.remove('hidden');
  });

  cancelBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  confirmBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) return alert("Veuillez entrer un nom.");
    if (drawScalarsMap[name]) return alert("Nom déjà utilisé.");

    const count = mesh.geometry.attributes.position.count;
    drawScalarsMap[name] = new Float32Array(count).fill(0.0);
    drawColorMap[name] = {};

    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    textureSelect.appendChild(opt);
    textureSelect.value = name;

    selectedTextureName = name;
    applyDrawTexture(mesh, drawScalarsMap[name], drawColorMap[name]);
    modal.classList.add('hidden');
    drawTools.style.display = 'block';

    document.getElementById('toggle-texture').checked = true;
    mesh.material.vertexColors = true;
    mesh.material.needsUpdate = true;
  });

  textureSelect.addEventListener('change', () => {
    selectedTextureName = textureSelect.value;
    if (selectedTextureName && drawScalarsMap[selectedTextureName]) {
      applyDrawTexture(mesh, drawScalarsMap[selectedTextureName], drawColorMap[selectedTextureName]);
      drawTools.style.display = 'block';
    }
  });

  colorInput.addEventListener('input', () => {
    brushColor = colorInput.value;
  });

  sizeInput.addEventListener('input', () => {
    brushSize = parseFloat(sizeInput.value);
    updateBrushPreview(scene);
  });

  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (e.ctrlKey && key === 'z') {
      undo(mesh);
    }
    if (key === 'a') {
      drawModeActive = !drawModeActive;
      showDrawStatus(drawModeActive ? "Mode dessin activé" : "Mode dessin désactivé");
    }
  });

  container.addEventListener('mousemove', (event) => {
    updateMouseCoords(event, container, mouse);
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(mesh);
    if (intersects.length > 0) {
      updateBrushPreviewPosition(intersects[0].point, mesh);
      if (!drawModeActive || !isDrawing || !selectedTextureName) return;
      event.stopPropagation();
      paint(mesh, intersects[0]);
    }
  });

  container.addEventListener('mousedown', (e) => {
    if (drawModeActive && e.button === 2 && selectedTextureName) {
      isDrawing = true;
      e.stopPropagation();
    }
  });

  window.addEventListener('mouseup', () => {
    isDrawing = false;
  });

  container.addEventListener('contextmenu', (e) => e.preventDefault());

  createBrushPreview(scene);
}

function paint(mesh, intersect) {
  const geometry = mesh.geometry;
  const posAttr = geometry.attributes.position;
  const brushRadius = brushSize * 0.0025;
  const point = intersect.point;
  const scalars = drawScalarsMap[selectedTextureName];
  const colorMap = drawColorMap[selectedTextureName];

  pushHistory(selectedTextureName);

  for (let i = 0; i < posAttr.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(posAttr, i);
    if (v.distanceTo(point) < brushRadius) {
      scalars[i] = 1.0;
      colorMap[i] = brushColor;
    }
  }

  applyDrawTexture(mesh, scalars, colorMap);
}

function applyDrawTexture(mesh, scalarArray, colorMap) {
  const colors = new Float32Array(scalarArray.length * 3);

  for (let i = 0; i < scalarArray.length; i++) {
    const s = scalarArray[i];
    if (s === 0) {
      colors.set([0.8, 0.8, 0.8], i * 3);
    } else {
      const hex = colorMap[i] || '#ff0000';
      const { r, g, b } = hexToRgb01(hex);
      colors.set([r, g, b], i * 3);
    }
  }

  mesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  mesh.geometry.attributes.color.needsUpdate = true;

  if (mesh.material) {
    mesh.material.vertexColors = true;
    mesh.material.needsUpdate = true;
  }
}

function updateMouseCoords(event, container, mouse) {
  const rect = container.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function hexToRgb01(hex) {
  const bigint = parseInt(hex.replace(/^#/, ''), 16);
  return {
    r: ((bigint >> 16) & 255) / 255,
    g: ((bigint >> 8) & 255) / 255,
    b: (bigint & 255) / 255
  };
}

function showDrawStatus(msg) {
  if (!drawStatusEl) return;
  drawStatusEl.textContent = msg;
  drawStatusEl.style.display = 'block';
  setTimeout(() => {
    drawStatusEl.style.display = 'none';
  }, 2000);
}

function pushHistory(name) {
  const snapshot = new Float32Array(drawScalarsMap[name]);
  drawHistory.push(snapshot);
  if (drawHistory.length > 20) drawHistory.shift();
}

function undo(mesh) {
  if (drawHistory.length === 0 || !selectedTextureName) return;
  const prev = drawHistory.pop();
  drawScalarsMap[selectedTextureName] = prev;
  applyDrawTexture(mesh, prev, drawColorMap[selectedTextureName]);
  showDrawStatus("Annulation effectuée");
}

function exportDrawTexture(name) {
  const scalars = drawScalarsMap[name];
  const colors = drawColorMap[name];
  const data = { scalars: Array.from(scalars), colors };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${name}.json`;
  link.click();
}

function createBrushPreview(scene) {
  const geometry = new THREE.SphereGeometry(1, 16, 16);
  const material = new THREE.MeshBasicMaterial({ color: 0xffff00, opacity: 0.5, transparent: true });
  brushPreview = new THREE.Mesh(geometry, material);
  brushPreview.visible = false;
  scene.add(brushPreview);
}

function updateBrushPreview(scene) {
  if (!brushPreview) return;
  const scale = brushSize * 0.005;
  brushPreview.scale.set(scale, scale, scale);
}

function updateBrushPreviewPosition(intersectionPoint, mesh) {
  if (!brushPreview || !selectedTextureName || !mesh) return;

  const posAttr = mesh.geometry.attributes.position;
  let closestVertex = null;
  let minDist = Infinity;

  for (let i = 0; i < posAttr.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(posAttr, i);
    const dist = v.distanceTo(intersectionPoint);
    if (dist < minDist) {
      minDist = dist;
      closestVertex = v;
    }
  }

  if (closestVertex) {
    brushPreview.visible = true;
    brushPreview.position.copy(closestVertex);
  }
}
