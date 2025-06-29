// normalModal.js
// ------------------------------------------------------------
// Gestion de la modale d'import / association de fichiers CSV
// de normales à des maillages déjà chargés.
// Calqué sur textureModal.js
// ------------------------------------------------------------

import { showStatus } from '../utils/utils.js';

/**
 * @param {Array<{ name:string, path:string, textures?:Array, normals?:Array }>} meshes - tableau global des maillages
 * @param {(mesh: object)=>void} updateNormalsForSelectedMesh - callback pour rafraîchir l'UI après association
 */
export function initNormalModal(meshes, updateNormalsForSelectedMesh) {
  // -----------------------------------
  // Sélecteurs & DOM
  const modal        = document.getElementById('normal-modal');
  const openBtn      = document.getElementById('open-normal-modal');
  const closeBtn     = document.getElementById('cancel-normal-load');

  const folderInput  = document.getElementById('normal-folder-path');
  const browseBtn    = document.getElementById('browse-normal-folder');
  const filterInput  = document.getElementById('normal-folder-filter');
  const filterBtn    = document.getElementById('filter-normal-folder');
  const folderList   = document.getElementById('normal-folder-list');
  const addBtn       = document.getElementById('add-normal-to-db');
  const selectAllBtn = document.getElementById('select-all-normals');

  const meshList     = document.getElementById('loaded-mesh-list-normals');
  const dbList       = document.getElementById('normal-db-list');
  const deleteBtn    = document.getElementById('delete-selected-normals');
  const loadBtn      = document.getElementById('load-normals-button');

  // -----------------------------------
  // État interne
  let folderFiles = [];   // Fichiers présents dans le dossier courant (après filtrage)
  let selectedFolder = ''; // Dossier actuellement listé
  let normalDB = [];       // Base de données locale des CSV prêts à être associés

  // -----------------------------------
  // Ouverture / fermeture de la modale
  openBtn?.addEventListener('click', () => {
    modal.classList.remove('hidden');
    renderMeshList();
  });

  closeBtn?.addEventListener('click', () => modal.classList.add('hidden'));

  // -----------------------------------
  // Navigation dans le système de fichiers
  browseBtn?.addEventListener('click', async () => {
    const path = folderInput.value.trim();
    if (!path) return showStatus('Entrez un chemin de dossier', true);

    try {
      const res = await fetch('http://localhost:8000/api/list-folder-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });

      const data = await res.json();
      if (res.ok) {
        folderFiles = data.files;
        selectedFolder = path;
        renderFolderFileList(folderFiles);
      } else {
        showStatus(data.error || 'Erreur', true);
      }
    } catch (err) {
      console.error(err);
      showStatus('Erreur réseau', true);
    }
  });

  // Filtrer l'affichage dans le dossier
  filterBtn?.addEventListener('click', () => {
    const keyword = filterInput.value.trim().toLowerCase();
    const filtered = folderFiles.filter(f => f.toLowerCase().includes(keyword));
    renderFolderFileList(filtered);
  });

  // Ajouter les CSV cochés à la « base de données » locale
  addBtn?.addEventListener('click', () => {
    const checked = Array.from(folderList.querySelectorAll('input:checked'))
      .map(input => input.dataset.filename);

    checked.forEach(fname => {
      const fullPath = `${selectedFolder}/${fname}`;
      if (!normalDB.some(f => f.name === fname && f.path === fullPath)) {
        normalDB.push({ name: fname, path: fullPath });
      }
    });

    updateNormalDb();
    showStatus(`${checked.length} normal(s) ajoutée(s)`);
  });

  // Sélectionner tout (liste dossier)
  selectAllBtn?.addEventListener('click', () => {
    folderList.querySelectorAll('input[type="checkbox"]').forEach(cb => (cb.checked = true));
  });

  // Supprimer des entrées de la DB
  deleteBtn?.addEventListener('click', () => {
    const toDelete = Array.from(dbList.querySelectorAll('input:checked')).map(cb => parseInt(cb.dataset.index));
    normalDB = normalDB.filter((_, i) => !toDelete.includes(i));
    updateNormalDb();
  });

  // --------------------------------------------------
  // Association normals -> maillages
  loadBtn?.addEventListener('click', () => {
    const selectedMeshIndices = Array.from(meshList.querySelectorAll('input:checked')).map(cb => parseInt(cb.dataset.index));
    const selectedNormalIndices = Array.from(dbList.querySelectorAll('input:checked')).map(cb => parseInt(cb.dataset.index));

    if (selectedMeshIndices.length === 0 || selectedNormalIndices.length === 0) {
      return showStatus('Veuillez sélectionner au moins un mesh et un fichier de normales', true);
    }

    if (selectedMeshIndices.length > 1 && selectedMeshIndices.length !== selectedNormalIndices.length) {
      return showStatus('Nombre de meshes et de fichiers de normales différents ; association impossible', true);
    }

    selectedNormalIndices.forEach((normalIdx, i) => {
      const meshIdx =
        selectedMeshIndices.length === 1 ? selectedMeshIndices[0] : selectedMeshIndices[i];

      const normalEntry = normalDB[normalIdx];
      if (!meshes[meshIdx].normals) meshes[meshIdx].normals = [];
      meshes[meshIdx].normals.push(normalEntry);
    });

    // Met à jour la liste déroulante si le mesh en cours est affecté
    const currentSelectedPath = document.getElementById('mesh-list').value;
    const currentSelectedMesh = meshes.find(m => m.path === currentSelectedPath);
    if (currentSelectedMesh) {
      const currentIdx = meshes.indexOf(currentSelectedMesh);
      if (selectedMeshIndices.includes(currentIdx)) {
        updateNormalsForSelectedMesh(currentSelectedMesh);
      }
    }

    showStatus('Fichiers de normales associés aux maillages avec succès');
    modal.classList.add('hidden');
  });

  // ------------------------------------------------------------------
  // Rendu d'interfaces auxiliaires

  function renderFolderFileList(files) {
    folderList.innerHTML = '';
    files.forEach(f => {
      const li = document.createElement('li');
      li.innerHTML = `<label><input type="checkbox" data-filename="${f}" /> ${f}</label>`;
      folderList.appendChild(li);
    });
  }

  function renderMeshList() {
    meshList.innerHTML = '';
    meshes.forEach((m, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<label><input type="checkbox" data-index="${i}" /> ${m.name}</label>`;
      meshList.appendChild(li);
    });

    // Ajoute un bouton « tout sélectionner » si non déjà présent (évite doublons)
    let btn = meshList.parentElement.querySelector('.select-all-meshes');
    if (!btn) {
      btn = document.createElement('button');
      btn.textContent = 'Tout sélectionner';
      btn.classList.add('select-all-meshes');
      btn.addEventListener('click', () => {
        meshList.querySelectorAll('input[type="checkbox"]').forEach(cb => (cb.checked = true));
      });
      meshList.parentElement.appendChild(btn);
    }
  }

  function updateNormalDb() {
    dbList.innerHTML = '';
    normalDB.forEach((entry, i) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${entry.name}</span>
        <input type="checkbox" data-index="${i}" />
      `;
      dbList.appendChild(li);
    });
  }
}
