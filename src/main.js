import { createMesh, setupScene } from './viewer.js';

let currentMesh = null;

fetch('/data.json')
  .then(res => res.json())
  .then(data => {
    document.getElementById('title').textContent = data.title || 'Cortex Viewer';

    // Initialiser la scène + contrôles + caméra
    const { scene, camera, renderer, controls } = setupScene(data);

    // Créer le premier maillage
    currentMesh = createMesh(data, 'viridis');
    scene.add(currentMesh);

    // Gestion du changement de colormap sans reload
    document.getElementById('colormap-select').addEventListener('change', e => {
      const cmap = e.target.value;
      scene.remove(currentMesh);
      currentMesh = createMesh(data, cmap);
      scene.add(currentMesh);
    });

    // Animation loop
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
