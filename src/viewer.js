import * as THREE from 'three';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';

import { applyColormap } from './colormap.js';

let renderer, scene, camera, controls;
let edgeLines = null;
let edgeMaterial = null;

/**
 * Initialise la scène, caméra, lumières, contrôles et renderer
 */
export function setupScene() {
  const container = document.getElementById('viewer-container');

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  camera = initCamera(container);
  renderer = initRenderer(container);
  controls = initControls(camera, renderer.domElement);
  initLights(scene);
  initResizeHandler(container, camera, renderer);

  // expose une fonction pour changer le fond plus tard
  function setBackgroundColor(hexColor) {
    scene.background = new THREE.Color(hexColor);
  }

  return { scene, camera, renderer, controls,setBackgroundColor };
}

function initCamera(container) {
  const aspect = container.clientWidth / container.clientHeight;
  const cam = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
  cam.position.set(0, 0, 5);
  return cam;
}

function initRenderer(container) {
  const ren = new THREE.WebGLRenderer({ antialias: true });
  ren.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(ren.domElement);
  return ren;
}

function initControls(cam, domElement) {
  const ctrl = new TrackballControls(cam, domElement);
  ctrl.rotateSpeed = 3.0;         // optionnel : un peu moins vif
  ctrl.zoomSpeed = 1.0;           // optionnel : plus doux
  ctrl.panSpeed = 0.4;            // réduit la sensibilité du pan
  ctrl.noZoom = false;
  ctrl.noPan = true;              // toggle par shift
  ctrl.staticMoving = false;      // laisser à false pour effet d'inertie
  ctrl.dynamicDampingFactor = 0.3; // augmente l'amortissement (plus fluide)

  // toggle pan avec shift
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Shift') ctrl.noPan = false;
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'Shift') ctrl.noPan = true;
  });

  return ctrl;
}

function initLights(scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const light = new THREE.DirectionalLight(0xffffff, 0.8);
  light.position.set(1, 1, 1);
  scene.add(light);
}

function initResizeHandler(container, camera, renderer) {
  window.addEventListener('resize', () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  });
}

/**
 * Construit la géométrie centrée à partir des données JSON
 */
export function buildGeometry(data) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.vertices.flat(), 3));
  geometry.setIndex(data.faces.flat());
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const center = geometry.boundingSphere.center;
  geometry.translate(-center.x, -center.y, -center.z);

  return geometry;
}

/**
 * Crée un mesh coloré par scalaires et colormap
 */
export function createMesh(meshData, scalars = null, cmapName = 'viridis', min = null, max = null) {
  const geometry = buildGeometry(meshData);

  if (scalars) {
    const colors = applyColormap(scalars, cmapName, min, max);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  const material = new THREE.MeshStandardMaterial({
    vertexColors: !!scalars, // true seulement si scalars présents
    side: THREE.DoubleSide,
    roughness: 0.8,
    metalness: 0.1,
    wireframe: false
  });

  return new THREE.Mesh(geometry, material);
}


/**
 * Met à jour l'affichage wireframe du mesh
 */
export function setWireframe(mesh, enabled) {
  if (mesh && mesh.material) {
    mesh.material.wireframe = enabled;
    mesh.material.needsUpdate = true;
  }
}


export function toggleEdges(mesh, scene, enabled, options = {}) {
  if (enabled) {
    if (!edgeLines) {
      const edges = new THREE.EdgesGeometry(mesh.geometry);
      edgeMaterial = new THREE.LineBasicMaterial({
        color: options.color || 0xffffff,
        linewidth: options.linewidth || 1
      });
      edgeLines = new THREE.LineSegments(edges, edgeMaterial);
      mesh.add(edgeLines);
    }

    // mise à jour dynamique
    if (options.color) edgeMaterial.color.set(options.color);
    if (options.linewidth !== undefined) edgeMaterial.linewidth = options.linewidth;

    edgeLines.visible = true;
  } else if (edgeLines) {
    edgeLines.visible = false;
  }
}

/**
 * Lance la boucle d'animation
 */
export function startRenderingLoop(scene, camera) {
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    controls.update(delta);
    renderer.render(scene, camera);
  }
  animate();
}
