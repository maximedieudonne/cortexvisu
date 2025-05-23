import { createScene } from './viewer.js';

fetch('/data.json')
  .then(res => res.json())
  .then(data => {
    document.getElementById('title').textContent = data.title || 'Cortex Viewer';
    createScene(data, 'viridis');

    document.getElementById('colormap-select').addEventListener('change', e => {
      location.reload(); // simple relance pour réappliquer la colormap
    });
  })
  .catch(err => {
    document.getElementById('title').textContent = `Erreur : ${err.message}`;
  });