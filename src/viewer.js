import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { applyColormap } from './colormap.js';

export function setupScene(data) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);

  // Calcule la taille du mesh pour placer la caméra
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.vertices.flat(), 3));
  geometry.setIndex(data.faces.flat());
  geometry.computeBoundingSphere();
  const radius = geometry.boundingSphere.radius;
  scene.userData.radius = radius;

  camera.position.set(0, 0, radius * 2.5);

  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 1.2;
  controls.enablePan = false;
  controls.minDistance = radius * 1.2;
  controls.maxDistance = radius * 10;
  controls.update();

  // Lumières
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const light = new THREE.DirectionalLight(0xffffff, 0.8);
  light.position.set(1, 1, 1);
  scene.add(light);

  // Resize dynamique
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Colorbar dynamique
  const min = Math.min(...data.scalars);
  const max = Math.max(...data.scalars);
  addColorbarToScene(scene, min, max);


  return { scene, camera, renderer, controls };
}

export function createMesh(data, cmapName) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.vertices.flat(), 3));
  geometry.setIndex(data.faces.flat());
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const center = geometry.boundingSphere.center;
  geometry.translate(-center.x, -center.y, -center.z);

  const colors = applyColormap(data.scalars, cmapName);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 0.8,
    metalness: 0.1
  });

  return new THREE.Mesh(geometry, material);
}

export function addColorbarToScene(scene, min, max) {
  const geometry = new THREE.PlaneGeometry(0.2, 2);

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    varying vec2 vUv;
    vec3 colormap(float t) {
      vec3 a = vec3(0.267, 0.005, 0.329);
      vec3 b = vec3(0.993, 0.906, 0.144);
      return mix(a, b, t);
    }
    void main() {
      float t = clamp(vUv.y, 0.0, 1.0);
      gl_FragColor = vec4(colormap(t), 1.0);
    }
  `;

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide
  });

  const colorbar = new THREE.Mesh(geometry, material);
  const offsetX = scene.userData.radius * 1.5 || 5;
  colorbar.position.set(offsetX, 0, 0);
  colorbar.position.z = 0.01;
  scene.add(colorbar);

  // Graduation texte (canvas -> sprite)
  function makeTextSprite(message, yOffset) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.font = '18px sans-serif';
    ctx.fillText(message, 2, 24);
    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.5, 0.125, 1);
    sprite.position.set(2.3, yOffset, 0);
    return sprite;
  }

  const labelMin = makeTextSprite(min.toFixed(2), -1);
  const labelMid = makeTextSprite(((min + max) / 2).toFixed(2), 0);
  const labelMax = makeTextSprite(max.toFixed(2), 1);

  scene.add(labelMin);
  scene.add(labelMid);
  scene.add(labelMax);
}
