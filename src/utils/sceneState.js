// utils/sceneState.js

let scene = null;
let camera = null;
let meshes = [];
let currentMesh = null;
let scalarMin = 0;
let scalarMax = 1;
let currentColormap = 'viridis';

export function updateSceneState({ scene: s, camera: c }) {
  if (s) scene = s;
  if (c) camera = c;
}

export function getScene() {
  return scene;
}

export function getCamera() {
  return camera;
}

export function setMeshes(m) {
  meshes = m;
}

export function getMeshes() {
  return meshes;
}

export function setCurrentMesh(mesh) {
  currentMesh = mesh;
}

export function getCurrentMesh() {
  return currentMesh;
}

export function setScalarMinMax(min, max) {
  scalarMin = min;
  scalarMax = max;
}

export function getScalarMinMax() {
  return { scalarMin, scalarMax };
}

export function setCurrentColormap(name) {
  currentColormap = name;
}

export function getCurrentColormap() {
  return currentColormap;
}
