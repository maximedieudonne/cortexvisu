
import { getCurrentMeshPath } from '../../utils/sceneState.js';

export function bindImportPackage() {
  document.getElementById("import-btn").addEventListener("click", async () => {
    const packageName = prompt("Nom du package à importer (ex: cortexanalyser)");
    if (!packageName) return;

    const res = await fetch("/api/import-package/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ package_name: packageName })
    });

    if (!res.ok) {
      const errorText = await res.text();
      alert("Erreur lors de l'import : " + errorText);
      return;
    }

    const { functions } = await res.json();
    createPackageButton(packageName, functions);
  });
}

function createPackageButton(packageName, functions) {
  const container = document.getElementById("package-buttons");
  if (!container) return;

  const existing = document.getElementById(`btn-${packageName}`);
  if (existing) return; // Évite doublon

  const btn = document.createElement("button");
  btn.id = `btn-${packageName}`;
  btn.textContent = `${packageName}`;
  btn.classList.add("package-btn");
  btn.onclick = () => showFunctionModal(functions);

  container.appendChild(btn);
}

function showFunctionModal(functions) {
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-content">
      <h2>Fonctions disponibles</h2>
      <div class="modal-actions"></div>
    </div>
  `;

  const actionContainer = modal.querySelector(".modal-actions");

  functions.forEach(fn => {
    const btn = document.createElement("button");
    btn.textContent = fn.label;
    btn.title = fn.description;

    btn.onclick = async () => {
      const overlay = document.getElementById("loading-overlay");
      overlay.classList.remove("hidden");

      try {
        // Appel backend
        const meshPath = getCurrentMeshPath(); 
        const res = await fetch(`/api/run-function/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: fn.name, mesh_path: meshPath })
        });

        if (!res.ok) {
          const errText = await res.text();
          alert("Erreur : " + errText);
        } else {
          const { result } = await res.json();
          alert("Résultat : " + JSON.stringify(result));
        }

      } catch (err) {
        alert("Erreur JS : " + err.message);
      } finally {
        overlay.classList.add("hidden");
      }
    };

    actionContainer.appendChild(btn);
  });

  const close = document.createElement("button");
  close.textContent = "Fermer";
  close.onclick = () => modal.remove();
  actionContainer.appendChild(close);

  document.body.appendChild(modal);
}

