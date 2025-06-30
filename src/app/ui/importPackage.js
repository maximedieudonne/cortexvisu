// importPackage.js
import {
  getCurrentMeshPath,
  getCurrentMesh
} from '../../utils/sceneState.js';
import { refreshMeshAssets } from '../../utils/refreshMeshAssets.js';

export function bindImportPackage() {

  document.getElementById('import-btn')
    .addEventListener('click', async () => {

      const packageName = prompt('Nom du package à importer (ex: cortexanalyser)');
      if (!packageName) return;

      const res = await fetch('/api/import-package/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_name: packageName })
      });

      if (!res.ok) {
        const errorText = await res.text();
        alert('Erreur lors de l\\import : ' + errorText);
        return;
      }

      const { functions } = await res.json();
      createPackageButton(packageName, functions);
    });
}

/* ------------------------------------------------------------------------- */

function createPackageButton(packageName, functions) {
  const container = document.getElementById('package-buttons');
  if (!container) return;

  if (document.getElementById(`btn-${packageName}`)) return; // évite doublon

  const btn = document.createElement('button');
  btn.id = `btn-${packageName}`;
  btn.textContent = packageName;
  btn.classList.add('package-btn');
  btn.onclick = () => showFunctionModal(functions);

  container.appendChild(btn);
}

/* ------------------------------------------------------------------------- */

function showFunctionModal(functions) {

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>Fonctions disponibles</h2>
      <div class="modal-actions"></div>
    </div>
  `;
  document.body.appendChild(modal);

  const actionContainer = modal.querySelector('.modal-actions');

  /* ---- Boutons de chaque fonction ------------------------------------- */
  functions.forEach(fn => {
    const btn = document.createElement('button');
    btn.textContent = fn.label;
    btn.title = fn.description;

    btn.onclick = async () => {
      const overlay = document.getElementById('loading-overlay');
      overlay.classList.remove('hidden');

      try {
        /* 1. Appel backend ------------------------------------------------ */
        const meshPath = getCurrentMeshPath();
        const res = await fetch('/api/run-function/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: fn.name, mesh_path: meshPath })
        });

        if (!res.ok) {
          const errText = await res.text();
          alert('Erreur : ' + errText);
          return;
        }

        const { result } = await res.json();

        /* 2. Rafraîchir assets + sélectionner dernière normale ------------ */
        const curMeta = getCurrentMesh()?.userData?.meta;
        if (curMeta) {
          await refreshMeshAssets(curMeta);

          if (curMeta.normals?.length) {
            const normalSelect = document.getElementById('normal-list');
            const newest = curMeta.normals[curMeta.normals.length - 1].path;
            normalSelect.value = newest;
            normalSelect.dispatchEvent(new Event('change'));
          }
        }

        alert('Résultat : ' + JSON.stringify(result));

      } catch (err) {
        alert('Erreur JS : ' + err.message);
      } finally {
        document.getElementById('loading-overlay').classList.add('hidden');
      }
    };

    actionContainer.appendChild(btn);
  });

  /* ---- Bouton fermer --------------------------------------------------- */
  const close = document.createElement('button');
  close.textContent = 'Fermer';
  close.onclick = () => modal.remove();
  actionContainer.appendChild(close);

  
}

