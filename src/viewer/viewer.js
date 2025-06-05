// viewer/viewer.js

import * as THREE from 'three';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
import { applyColormap } from './colormap.js';

let renderer, scene, camera, controls;
let wireframeLines = null;
let wireframeMaterial = null;

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

  function setBackgroundColor(hexColor) {
    scene.background = new THREE.Color(hexColor);
  }

  return { scene, camera, renderer, controls, setBackgroundColor };
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
  ctrl.rotateSpeed = 2.0;
  ctrl.zoomSpeed = 0.8;
  ctrl.panSpeed = 0.3;
  ctrl.dynamicDampingFactor = 0.2;
  ctrl.staticMoving = true;
  ctrl.noZoom = false;
  ctrl.noPan = true;

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

export function createMesh(meshData, scalars = null, cmapName = 'viridis', min = null, max = null) {
  const geometry = buildGeometry(meshData);

  if (scalars) {
    const colors = applyColormap(scalars, cmapName, min, max);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  const material = new THREE.MeshStandardMaterial({
    vertexColors: !!scalars,
    side: THREE.DoubleSide,
    roughness: 0.8,
    metalness: 0.1,
    wireframe: false
  });

  const mesh = new THREE.Mesh(geometry, material);

  // Ajout des métadonnées (si disponibles)
  mesh.userData.meta = {
  id: meshData.id || null,
  name: meshData.name || '',
  path: meshData.path || ''
  };
  return mesh;
}

export function setWireframe(mesh, enabled) {
  if (mesh && mesh.material) {
    mesh.material.wireframe = enabled;
    mesh.material.needsUpdate = true;
  }
}

export function toggleEdges(mesh, scene, enabled, options = {}) {
  if (enabled) {
    if (!mesh.userData.edgeLines) {
      const wire = new THREE.WireframeGeometry(mesh.geometry);
      const material = new THREE.LineBasicMaterial({
        color: options.color || 0xffffff
      });
      const edgeLines = new THREE.LineSegments(wire, material);
      mesh.userData.edgeLines = edgeLines;
      mesh.add(edgeLines);
    }

    // mettre à jour la couleur
    const edgeLines = mesh.userData.edgeLines;
    if (options.color) {
      edgeLines.material.color.set(options.color);
    }

    mesh.userData.edgeLines.visible = true;

  } else if (mesh.userData.edgeLines) {
    mesh.userData.edgeLines.visible = false;
  }
}


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
