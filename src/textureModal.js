import { showStatus } from './utils.js';

export function initTextureModal(meshes, onTexturesLoaded, updateTextureListForSelectedMesh) {

  const modal = document.getElementById('texture-modal');
  const openBtn = document.getElementById('open-texture-modal');
  const closeBtn = document.getElementById('cancel-texture-load');

  const folderInput = document.getElementById('texture-folder-path');
  const browseBtn = document.getElementById('browse-texture-folder');
  const filterInput = document.getElementById('texture-folder-filter');
  const filterBtn = document.getElementById('filter-texture-folder');
  const folderList = document.getElementById('texture-folder-list');
  const addBtn = document.getElementById('add-texture-to-db');
  const selectAllBtn = document.getElementById('select-all-textures');

  const meshList = document.getElementById('loaded-mesh-list');
  const dbList = document.getElementById('texture-db-list');
  const deleteBtn = document.getElementById('delete-selected-textures');
  const loadBtn = document.getElementById('load-textures-button');

  let folderFiles = [];
  let selectedFolder = '';
  let textureDB = [];

  openBtn?.addEventListener('click', () => {
    modal.classList.remove('hidden');
    renderMeshList();
    function renderMeshList() {
  meshList.innerHTML = '';
  meshes.forEach((m, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<label><input type="checkbox" data-index="${i}" /> ${m.name}</label>`;
    meshList.appendChild(li);
  });

  const selectAllMeshesBtn = document.createElement('button');
  selectAllMeshesBtn.textContent = "Tout sélectionner";
  selectAllMeshesBtn.addEventListener('click', () => {
    meshList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
  });
  meshList.parentElement.appendChild(selectAllMeshesBtn);
}

  });

  closeBtn?.addEventListener('click', () => modal.classList.add('hidden'));

  browseBtn?.addEventListener('click', async () => {
    const path = folderInput.value.trim();
    if (!path) {
      showStatus("Entrez un chemin de dossier", true);
      return;
    }

    const res = await fetch("http://localhost:8000/api/list-folder-files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path })
    });

    const data = await res.json();
    if (res.ok) {
      folderFiles = data.files;
      selectedFolder = path;
      renderFolderFileList(folderFiles);
    } else {
      showStatus(data.error || "Erreur", true);
    }
  });

  filterBtn?.addEventListener('click', () => {
    const keyword = filterInput.value.trim().toLowerCase();
    const filtered = folderFiles.filter(f => f.toLowerCase().includes(keyword));
    renderFolderFileList(filtered);
  });

  addBtn?.addEventListener('click', () => {
    const checked = Array.from(folderList.querySelectorAll('li input:checked'))
      .map(input => input.dataset.filename);

    checked.forEach(fname => {
      const fullPath = `${selectedFolder}/${fname}`;
      if (!textureDB.some(f => f.name === fname && f.path === fullPath)) {
        textureDB.push({ name: fname, path: fullPath });
      }
    });

    updateTextureDb();
    showStatus(`${checked.length} texture(s) ajoutée(s)`);
  });

  selectAllBtn?.addEventListener('click', () => {
    folderList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
  });

  deleteBtn?.addEventListener('click', () => {
    const toDelete = Array.from(dbList.querySelectorAll('input:checked'))
      .map(cb => parseInt(cb.dataset.index));
    textureDB = textureDB.filter((_, i) => !toDelete.includes(i));
    updateTextureDb();
  });

  loadBtn?.addEventListener('click', () => {
  const selectedMeshIndices = Array.from(meshList.querySelectorAll('input:checked'))
    .map(cb => parseInt(cb.dataset.index));

  const selectedTextureIndices = Array.from(dbList.querySelectorAll('input:checked'))
    .map(cb => parseInt(cb.dataset.index));

  if (selectedMeshIndices.length === 0 || selectedTextureIndices.length === 0) {
    showStatus("Veuillez sélectionner au moins un mesh et une texture", true);
    return;
  }

  if (
    selectedMeshIndices.length > 1 &&
    selectedMeshIndices.length !== selectedTextureIndices.length
  ) {
    showStatus("Nombre de meshes et textures différents : association impossible", true);
    return;
  }

  selectedTextureIndices.forEach((textureIdx, i) => {
    const meshIdx = selectedMeshIndices.length === 1
      ? selectedMeshIndices[0]
      : selectedMeshIndices[i];

    const texture = textureDB[textureIdx];
    if (!meshes[meshIdx].textures) meshes[meshIdx].textures = [];
    meshes[meshIdx].textures.push(texture);
  });

  if (selectedMeshIndices.length === 1) {
  updateTextureListForSelectedMesh(meshes[selectedMeshIndices[0]]);
} else if (selectedMeshIndices.length === selectedTextureIndices.length) {
  // Met à jour pour le dernier mesh associé
  updateTextureListForSelectedMesh(meshes[selectedMeshIndices[selectedMeshIndices.length - 1]]);
}

  showStatus("Textures associées aux maillages avec succès");
  modal.classList.add('hidden');
});


  function renderFolderFileList(files) {
    folderList.innerHTML = '';
    files.forEach(f => {
      const li = document.createElement('li');
      li.innerHTML = `<label><input type="checkbox" data-filename="${f}"/> ${f}</label>`;
      folderList.appendChild(li);
    });
  }

  function renderMeshList() {
    meshList.innerHTML = '';
    meshes.forEach(m => {
      const li = document.createElement('li');
      li.textContent = m.name;
      meshList.appendChild(li);
    });
  }

  function updateTextureDb() {
    dbList.innerHTML = '';
    textureDB.forEach((entry, i) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${entry.name}</span>
        <input type="checkbox" data-index="${i}" />
      `;
      dbList.appendChild(li);
    });
  }

  
}
