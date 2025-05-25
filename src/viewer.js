import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
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

  return { scene, camera, renderer, controls };
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
  const ctrl = new OrbitControls(cam, domElement);
  ctrl.enableDamping = true;
  ctrl.dampingFactor = 0.1;
  ctrl.rotateSpeed = 0.6;
  ctrl.zoomSpeed = 1.2;
  ctrl.enablePan = false;
  return ctrl;
}

function initLights(scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
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
export function createMesh(data, cmapName, min = null, max = null) {
  const geometry = buildGeometry(data);
  const colors = applyColormap(data.scalars, cmapName, min, max);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
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
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}
