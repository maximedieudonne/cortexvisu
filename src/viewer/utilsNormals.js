// src/viewer/utilsNormals.js
import * as THREE from 'three';
import { fetchNormals } from '../services/NormalsService.js';

let normalsLines = null;      // notre objet LineSegments

export async function applyNormalsToMesh(mesh, csvPath, scene) {
  /* 1. Récupérer & injecter les normales ---------------------------------- */
  const normals = await fetchNormals(csvPath);
  mesh.geometry.setAttribute(
    'normal',
    new THREE.BufferAttribute(normals, 3)
  );
  mesh.geometry.normalizeNormals();

  /* 2. Créer / mettre à jour le visuel ------------------------------------ */
  const length = autoLength(mesh);                       // 1 % du diag scène
  if (normalsLines) scene.remove(normalsLines);
  normalsLines = buildNormalsLines(mesh, length);
  scene.add(normalsLines);
}

/* ------------------------------------------------------------------------ */
/* OUTILS ================================================================= */
/* ------------------------------------------------------------------------ */

// Calcule ~1 % de la diagonale de la bounding-box du mesh
function autoLength(mesh) {
  const box = new THREE.Box3().setFromObject(mesh);
  return box.getSize(new THREE.Vector3()).length() * 0.01;
}

function buildNormalsLines(mesh, len) {
  const posAttr = mesh.geometry.getAttribute('position');
  const norAttr = mesh.geometry.getAttribute('normal');
  const vCount  = posAttr.count;

  const lines = new Float32Array(vCount * 2 * 3); // start & end -> 2 verts

  for (let i = 0; i < vCount; i++) {
    const ix = i * 3;
    const lx = i * 6;        // deux sommets

    // point d’origine
    lines[lx]     = posAttr.array[ix];
    lines[lx + 1] = posAttr.array[ix + 1];
    lines[lx + 2] = posAttr.array[ix + 2];

    // point extrémité = p + n*len
    lines[lx + 3] = posAttr.array[ix]     + norAttr.array[ix]     * len;
    lines[lx + 4] = posAttr.array[ix + 1] + norAttr.array[ix + 1] * len;
    lines[lx + 5] = posAttr.array[ix + 2] + norAttr.array[ix + 2] * len;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(lines, 3));

  const mat = new THREE.LineBasicMaterial({
  color: 0xff00ff,
  depthTest: true,
  depthWrite: false,
  transparent: true,
  opacity: 0.9
 });

  const segments = new THREE.LineSegments(geom, mat);
  segments.renderOrder = 1;   // passe après le mesh
  return segments;
}

// Permet de masquer manuellement le visuel s’il existe
export function removeNormalsLines(scene) {
  if (normalsLines) {
    scene.remove(normalsLines);
    normalsLines.geometry.dispose();
    normalsLines.material.dispose();
    normalsLines = null;
  }
}


export function setNormalsVisible(show) {
  if (normalsLines) normalsLines.visible = show;
}