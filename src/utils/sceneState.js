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



export function updateInfoPanel({ mesh, meshMeta, texture, textureMeta }) {
  const meshInfo = document.getElementById('mesh-info');
  const textureInfo = document.getElementById('texture-info');

  meshInfo.innerHTML = '';
  textureInfo.innerHTML = '';

  if (mesh && meshMeta) {
    meshInfo.innerHTML = `
      <li><b>Nom :</b> ${meshMeta.name}</li>
      <li><b>Chemin :</b> ${meshMeta.path}</li>
      <li><b>Vertices :</b> ${mesh.geometry.attributes.position.count}</li>
      <li><b>Faces :</b> ${mesh.geometry.index.count / 3}</li>
    `;
  }

  if (texture && textureMeta) {
    const min = Math.min(...textureMeta.scalars);
    const max = Math.max(...textureMeta.scalars);
    const mean = (textureMeta.scalars.reduce((a, b) => a + b, 0) / textureMeta.scalars.length).toFixed(3);

    textureInfo.innerHTML = `
      <li><b>Nom :</b> ${textureMeta.name}</li>
      <li><b>Chemin :</b> ${textureMeta.path}</li>
      <li><b>Min :</b> ${min.toFixed(3)}</li>
      <li><b>Max :</b> ${max.toFixed(3)}</li>
      <li><b>Moyenne :</b> ${mean}</li>
    `;
  }
}
