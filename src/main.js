import { createMesh, setupScene } from './viewer.js';
import { applyColormap } from './colormap.js';

let currentMesh = null;

fetch('/data.json')
  .then(res => res.json())
  .then(data => {
    document.getElementById('title').textContent = data.title || 'Cortex Viewer';

    const { scene, camera, renderer, controls } = setupScene(data);

    const min = Math.min(...data.scalars);
    const max = Math.max(...data.scalars);

    updateColorbar(min, max);

    currentMesh = createMesh(data, 'viridis');
    scene.add(currentMesh);

    document.getElementById('colormap-select').addEventListener('change', e => {
      const cmap = e.target.value;
      scene.remove(currentMesh);
      currentMesh = createMesh(data, cmap);
      scene.add(currentMesh);
    });

    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }

    animate();
  })
  .catch(err => {
    document.getElementById('title').textContent = `Erreur : ${err.message}`;
  });

function updateColorbar(min, max) {
  const canvas = document.getElementById('colorbar-canvas');
  const ctx = canvas.getContext('2d');
  const h = canvas.height;

  for (let y = 0; y < h; y++) {
    const t = y / h;
    const [r, g, b] = applyColormap([t], 'viridis');
    ctx.fillStyle = `rgb(${Math.floor(r*255)}, ${Math.floor(g*255)}, ${Math.floor(b*255)})`;
    ctx.fillRect(0, h - y, canvas.width, 1);
  }

  document.getElementById('label-min').textContent = min.toFixed(2);
  document.getElementById('label-mid').textContent = ((min + max) / 2).toFixed(2);
  document.getElementById('label-max').textContent = max.toFixed(2);
}
