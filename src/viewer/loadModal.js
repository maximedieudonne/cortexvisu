import { showStatus } from '../utils/utils.js';

export function initLoadModal(meshesRef) {
  const modal = document.getElementById('load-modal');
  const openBtn = document.getElementById('open-load-modal');
  const closeBtn = document.getElementById('cancel-load');
  const loadSelectedBtn = document.getElementById('load-selected');
  const selectAllBtn = document.getElementById('select-all');
  const deleteBtn = document.getElementById('delete-selected');
  const dbList = document.getElementById('mesh-db-list');

  const folderPathInput = document.getElementById('selected-folder-path');
  const folderTrigger = document.getElementById('select-folder');
  const filterInput = document.getElementById('folder-filter');
  const filterBtn = document.getElementById('filter-folder-files');
  const folderFileList = document.getElementById('folder-file-list');
  const addFolderBtn = document.getElementById('add-folder-to-db');
  const selectAllFolderBtn = document.getElementById('select-all-folder-files');

  let database = [];
  let folderFiles = [];
  let selectedFolder = '';

  openBtn?.addEventListener('click', () => {
    modal.classList.remove('hidden');
  });

  closeBtn?.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  folderTrigger?.addEventListener('click', handleFolderSelection);
  filterBtn?.addEventListener('click', filterFolderFiles);
  addFolderBtn?.addEventListener('click', addSelectedFilesToDatabase);

  selectAllFolderBtn?.addEventListener('click', () => {
    folderFileList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
  });

  selectAllBtn?.addEventListener('click', () => {
    dbList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
  });

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

  loadSelectedBtn?.addEventListener("click", () => {
    const selected = database.filter((_, i) =>
      dbList.querySelector(`input[data-index="${i}"]`)?.checked
    );

    if (selected.length === 0) {
      showStatus("Aucun fichier sélectionné", true);
      return;
    }

    meshesRef.length = 0;
    selected.forEach(file => {
      meshesRef.push({
        id: file.name,
        name: file.name,
        path: file.path,
        textures: []
      });
    });

    const meshListVis = document.getElementById("mesh-list");
    meshListVis.innerHTML = "";

    selected.forEach(file => {
      const option = document.createElement("option");
      option.value = file.path;
      option.textContent = file.name.replace(/\.json$/, '').replace(/\.[^/.]+$/, '');
      meshListVis.appendChild(option);
    });

    const firstOption = meshListVis.options[0];
    if (firstOption) {
      meshListVis.value = firstOption.value;
      meshListVis.dispatchEvent(new Event("change"));
    }

    modal.classList.add("hidden");
    showStatus(`${selected.length} maillage(s) sélectionné(s) avec succès`);
  });

  async function handleFolderSelection() {
    const path = folderPathInput.value.trim();
    if (!path) return showStatus("Veuillez saisir un chemin de dossier", true);

    try {
      const res = await fetch("http://localhost:8000/api/list-folder-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path })
      });

      const data = await res.json();
      if (!res.ok) return showStatus(data.error || "Erreur inconnue", true);

      folderFiles = data.files;
      selectedFolder = path;
      renderFolderFileList(folderFiles);
      showStatus(`${folderFiles.length} fichier(s) trouvé(s)`);
    } catch (err) {
      console.error(err);
      showStatus("Erreur réseau", true);
    }
  }

  function filterFolderFiles() {
    const keyword = filterInput.value.trim().toLowerCase();
    const filtered = folderFiles.filter(f => f.toLowerCase().includes(keyword));
    renderFolderFileList(filtered);
  }

  function addSelectedFilesToDatabase() {
    const checked = Array.from(folderFileList.querySelectorAll('li input:checked'))
      .map(input => input.dataset.filename);

    checked.forEach(fname => {
      const fullPath = `${selectedFolder}/${fname}`;
      if (!database.some(f => f.name === fname && f.path === fullPath)) {
        database.push({ name: fname, path: fullPath, type: 'mesh' });
      }
    });

    updateDbList();
    showStatus(`${checked.length} fichier(s) ajouté(s)`);
    folderPathInput.value = '';
  }

  function updateDbList() {
    dbList.innerHTML = '';
    database.forEach((entry, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${entry.name}</span><input type="checkbox" data-index="${i}" />`;
      dbList.appendChild(li);
    });
  }

  function renderFolderFileList(files) {
    folderFileList.innerHTML = '';
    files.forEach(f => {
      const li = document.createElement('li');
      li.innerHTML = `<label><input type="checkbox" data-filename="${f}"/> ${f}</label>`;
      folderFileList.appendChild(li);
    });
  }
}
