import { showStatus } from './utils.js';

export function initLoadModal(meshesRef) {
  // DOM Elements
  const modal = document.getElementById('load-modal');
  const openBtn = document.getElementById('open-load-modal');
  const closeBtn = document.getElementById('cancel-load');

  const loadDatabaseBtn = document.getElementById('load-database');  // Nouveau bouton pour générer la base de données

  const dbList = document.getElementById('mesh-db-list');
  let database = [];  // Base de données des fichiers (maillages et textures)

  // -----------------------------------
  // Ouverture et fermeture de la modale
  openBtn?.addEventListener('click', () => modal.classList.remove('hidden'));
  closeBtn?.addEventListener('click', () => modal.classList.add('hidden'));

  // -----------------------------------
  // Sélectionner un dossier pour les maillages
  const folderPathInput = document.getElementById('selected-folder-path');
  const folderTrigger = document.getElementById('select-folder');
  const filterInput = document.getElementById('folder-filter');
  const filterBtn = document.getElementById('filter-folder-files');
  const folderFileList = document.getElementById('folder-file-list');
  const addFolderBtn = document.getElementById('add-folder-to-db');
  const loadSelectedBtn = document.getElementById('load-selected');
  const selectAllBtn = document.getElementById('select-all-folder-files');
  const deleteBtn = document.getElementById('delete-selected');

  let folderFiles = [];
  let selectedFolder = '';

  folderTrigger?.addEventListener('click', handleFolderSelection);
  filterBtn?.addEventListener('click', handleFilterFiles);
  addFolderBtn?.addEventListener('click', handleAddFolderToDatabase);

  selectAllBtn?.addEventListener('click', () => {
    folderFileList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);  // Sélectionner toutes les cases
  });

  // Ajouter le gestionnaire d'événements pour "Charger les fichiers sélectionnés"
    loadSelectedBtn?.addEventListener("click", async () => {
  // Récupérer les fichiers sélectionnés dans la base de données
  const selected = database.filter((_, i) =>
    dbList.querySelector(`input[data-index="${i}"]`)?.checked
  );

  if (selected.length === 0) {
    showStatus("Aucun fichier sélectionné", true);
    return;
  }

  // Mise à jour de la variable global meshRef
  meshesRef.length = 0;
  selected.forEach(file => {
    meshesRef.push({
      id : file.name,
      name : file.name,
      path: file.path,
      texture : []
    })
  })

  // Mise à jour de la liste déroulante des maillages dans Visualisation
  const meshListVis = document.getElementById("mesh-list");
  meshListVis.innerHTML = ""; // Vider la liste actuelle

  selected.forEach(file => {
    const option = document.createElement("option");
    option.value = file.path;  // ou `file.name` si tu veux juste un nom
    const fileName = file.name.replace(/\.json$/, "").replace(/\.[^/.]+$/, ""); // Nettoyage
    option.textContent = fileName;
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

  // Ajoute un événement pour sélectionner tout dans la base de données
  document.getElementById('select-all')?.addEventListener('click', () => {
    dbList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);  // Sélectionner toutes les cases de la base de données
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

  // -----------------------------------
  // Fonction pour ouvrir le dossier
  function handleFolderSelection() {
    const folderPath = folderPathInput.value.trim();
    if (!folderPath) {
      showStatus("Veuillez saisir un chemin de dossier", true);
      return;
    }

    fetchFolderFiles(folderPath);
  }

  // Fonction pour récupérer les fichiers du dossier
  async function fetchFolderFiles(folderPath) {
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
  }

  // -----------------------------------
  // Filtrer les fichiers dans le dossier
  function handleFilterFiles() {
    const keyword = filterInput.value.trim().toLowerCase();
    const filtered = folderFiles.filter(f => f.toLowerCase().includes(keyword));
    renderFolderFileList(filtered);
  }

  // -----------------------------------
  // Ajouter des fichiers à la base de données
  function handleAddFolderToDatabase() {
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

  // -----------------------------------
  // Mise à jour de la liste des fichiers dans la base de données
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

  // -----------------------------------
  // Afficher les fichiers dans la liste
  function renderFolderFileList(files) {
    folderFileList.innerHTML = '';
    files.forEach(f => {
      const li = document.createElement('li');
      li.innerHTML = `<label><input type="checkbox" data-filename="${f}"/> ${f}</label>`;
      folderFileList.appendChild(li);
    });
  }
}
