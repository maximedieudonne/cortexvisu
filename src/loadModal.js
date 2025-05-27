// loadModal.js
import { showStatus } from './utils.js';

export function initLoadModal(onFilesLoaded) {
  // DOM Elements
  const modal = document.getElementById('load-modal');
  const openBtn = document.getElementById('open-load-modal');
  const closeBtn = document.getElementById('cancel-load');

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.gii';

  const fileTrigger = document.getElementById('select-single-file');
  const filePathDisplay = document.getElementById('selected-file-path');
  const addSingleBtn = document.getElementById('add-single-to-db');

  const folderPathInput = document.getElementById('selected-folder-path');
  const folderTrigger = document.getElementById('select-folder');
  const filterInput = document.getElementById('folder-filter');
  const filterBtn = document.getElementById('filter-folder-files');
  const folderFileList = document.getElementById('folder-file-list');
  const addFolderBtn = document.getElementById('add-folder-to-db');

  const dbList = document.getElementById('mesh-db-list');
  const deleteBtn = document.getElementById('delete-selected');
  const selectAllBtn = document.getElementById('select-all');
  const loadSelectedBtn = document.getElementById('load-selected');

  let folderFiles = [];
  let selectedFolder = '';
  let database = [];

  // ------------------
  // MODALE
  openBtn?.addEventListener('click', () => modal.classList.remove('hidden'));
  closeBtn?.addEventListener('click', () => modal.classList.add('hidden'));


  // ------------------
  // OPTION 2 — Dossier (manuel)
  folderTrigger?.addEventListener('click', async () => {
    const folderPath = folderPathInput.value.trim();
    if (!folderPath) {
      showStatus("Veuillez saisir un chemin de dossier", true);
      return;
    }

    try {
      const res = await fetch("http://localhost:8000/api/list-folder-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: folderPath })
      });

      const data = await res.json();
      if (res.ok) {
        folderFiles = data.files;
        selectedFolder = folderPath;
        renderFolderFileList(folderFiles);
        showStatus(`${folderFiles.length} fichier(s) trouvés`);
      } else {
        showStatus(data.error || "Erreur inconnue", true);
      }
    } catch (err) {
      showStatus("Erreur réseau", true);
      console.error(err);
    }
  });

  filterBtn?.addEventListener('click', () => {
    const keyword = filterInput.value.trim().toLowerCase();
    const filtered = folderFiles.filter(f => f.toLowerCase().includes(keyword));
    renderFolderFileList(filtered);
  });

  addFolderBtn?.addEventListener('click', () => {
    const checked = Array.from(folderFileList.querySelectorAll('li input:checked'))
      .map(input => input.dataset.filename);

    checked.forEach(fname => {
      const fullPath = `${selectedFolder}/${fname}`;
      if (!database.some(f => f.name === fname && f.path === fullPath)) {
        database.push({ name: fname, path: fullPath });
      }
    });

    updateDbList();
    // Bouton : Tout sélectionner les fichiers dans la DB
selectAllBtn?.addEventListener('click', () => {
  dbList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
});

// Bouton : Supprimer les fichiers sélectionnés de la DB
deleteBtn?.addEventListener('click', () => {
  const toDelete = Array.from(dbList.querySelectorAll('input:checked'))
    .map(cb => parseInt(cb.dataset.index));

  if (toDelete.length === 0) {
    showStatus("Aucun fichier à supprimer", true);
    return;
  }

  database = database.filter((_, i) => !toDelete.includes(i));
  updateDbList();
  showStatus(`${toDelete.length} supprimé(s)`);
});

    showStatus(`${checked.length} fichier(s) ajouté(s)`);
    folderPathInput.value = '';
  });

  function renderFolderFileList(files) {
    folderFileList.innerHTML = '';
    files.forEach(f => {
      const li = document.createElement('li');
      li.innerHTML = `<label><input type="checkbox" data-filename="${f}"/> ${f}</label>`;
      folderFileList.appendChild(li);
    });
  }

  const selectAllFolderBtn = document.getElementById('select-all-folder-files');

    selectAllFolderBtn?.addEventListener('click', () => {
    folderFileList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
    });

  // ------------------
  // BASE DE DONNÉES
  function updateDbList() {
    dbList.innerHTML = '';
    database.forEach((entry, i) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${entry.name}</span>
        <input type="checkbox" data-index="${i}" />
      `;
      dbList.appendChild(li);
    });
  }

  loadSelectedBtn?.addEventListener('click', async () => {
  const selected = database.filter((_, i) =>
    dbList.querySelector(`input[data-index="${i}"]`)?.checked
  );

  if (selected.length === 0) {
    showStatus("Aucun fichier sélectionné", true);
    return;
  }

  try {
    const res = await fetch("http://localhost:8000/api/import-meshes-from-folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        folder: selectedFolder,
        files: selected.map(f => f.name)
      })
    });

    const importedMeshes = await res.json();

    if (Array.isArray(importedMeshes) && onFilesLoaded) {
      onFilesLoaded(importedMeshes); // contient vertices, faces, etc.
    }

    modal.classList.add('hidden');
    showStatus(`${importedMeshes.length} mesh importé(s) avec succès`);
  } catch (error) {
    console.error("Erreur d'import de mesh :", error);
    showStatus("Erreur serveur lors de l'import des maillages", true);
  }
});


  
}
