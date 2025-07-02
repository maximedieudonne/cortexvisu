// importPackage.js
import {
  getMeshes,
  getCurrentMeshPath,
  getCurrentMesh
} from '../../utils/sceneState.js';
import { refreshMeshAssets } from '../../utils/refreshMeshAssets.js';

export function bindImportPackage() {

  const importBtn = document.getElementById('import-btn');
  if (!importBtn) return;

  importBtn.addEventListener('click', async () => {
      const packageName = prompt('Nom du package à importer (ex: cortexanalyser)');
      if (!packageName) return;

      try {
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
      
      } catch (err) {
      alert('Erreur lors de l\'import : ' + err.message);
      }

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

/* ------------------------------------------------------------------------- */
function showFunctionModal(functions) {
  const loadedMeshes = (getMeshes() || []).map(m => ({
    path: m.path,
    label: m.name || m.path.split('/').pop()
  }));

  // Création structure modale ------------------------------------------------
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content pkg-flex">
      <button id="pkg-close" class="close-btn">✖</button>

      <aside  id="pkg-col-fn"   class="pkg-col"><h4>Fonctions</h4></aside>
      <section id="pkg-col-mesh" class="pkg-col"><h4>Maillages</h4>
        <button id="pkg-mesh-all">Tout sélectionner</button>
        <ul id="pkg-mesh-list" class="checkbox-list"></ul>
      </section>
      <section id="pkg-col-arg"  class="pkg-col"><h4>Arguments</h4>
        <form id="pkg-arg-form"></form>
      </section>
    </div>
    <div class="modal-actions">
      <button id="pkg-run" disabled>Run</button>
    </div>`;
  document.body.appendChild(modal);

  /* ----------- état & helpers ------------------------------------------- */
  let currentFn = null;
  let currentMeta = {};
  const checkedMeshes = new Set();

  const runBtn  = modal.querySelector('#pkg-run');
  const argForm = modal.querySelector('#pkg-arg-form');

  const toggleRun = () => {
    runBtn.disabled = !(currentFn && checkedMeshes.size);
  };

  /* ----------- Colonne fonctions ---------------------------------------- */
  const fnCol = modal.querySelector('#pkg-col-fn');
  functions.forEach(f => {
    const b = document.createElement('button');
    b.textContent = f.label;
    b.title = f.description;
    b.onclick = () => {
      currentFn  = f.name;
      currentMeta = f.step_metadata || {};
      renderArgForm();
      toggleRun();
    };
    fnCol.appendChild(b);
  });

  /* ----------- Colonne meshes ------------------------------------------- */
  const meshUl = modal.querySelector('#pkg-mesh-list');
  loadedMeshes.forEach(m => {
    const li  = document.createElement('li');
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.dataset.path = m.path;
    chk.onchange = () => {
      chk.checked ? checkedMeshes.add(m.path) : checkedMeshes.delete(m.path);
      toggleRun();
    };
    li.append(chk, document.createTextNode(' ' + m.label));
    meshUl.appendChild(li);
  });

  modal.querySelector('#pkg-mesh-all').onclick = () => {
    meshUl.querySelectorAll('input[type=checkbox]').forEach(c => {
      c.checked = true;
      checkedMeshes.add(c.dataset.path);
    });
    toggleRun();
  };

  /* ----------- Colonne arguments --------------------------------------- */
  const renderArgForm = () => {
    argForm.innerHTML = '';

    // Dossier output (commun)
    const labOut = document.createElement('label');
    labOut.textContent = 'output_dir: ';
    const inpOut = document.createElement('input');
    inpOut.name = 'output_dir';
    inpOut.placeholder = '/public/<nom_sujet>'; // laissé vide = gestion serveur
    labOut.appendChild(inpOut);
    argForm.appendChild(labOut);

    // Arguments spécifiques (issus YAML)
    Object.entries(currentMeta).forEach(([k, v]) => {
      const lab = document.createElement('label');
      lab.textContent = k + ': ';
      const inp = document.createElement('input');
      inp.name = k;
      inp.value = v;
      inp.dataset.arg = '1';
      lab.appendChild(inp);
      argForm.appendChild(lab);
    });
  };

  /* ----------- Bouton RUN ---------------------------------------------- */
  runBtn.onclick = async () => {
    const overlay = document.getElementById('loading-overlay');
    overlay.classList.remove('hidden');

    const argsUser = {};
    argForm.querySelectorAll('input[data-arg]').forEach(inp => {
      argsUser[inp.name] = inp.value;
    });
    // récupérer output_dir si rempli
    const outDirVal = argForm.querySelector('input[name="output_dir"]').value;
    if (outDirVal) argsUser.output_dir = outDirVal;

    try {
      const res = await fetch('/api/run-function-batch/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: currentFn,
          mesh_paths: [...checkedMeshes],
          args_user: argsUser
        })
      });

      if (!res.ok) throw new Error(await res.text());

      const { results } = await res.json();
      console.table(results);

      // rafraîchir assets pour chaque mesh traité
      for (const r of results) {
        await refreshMeshAssets({ path: r.out });
      }

      alert('Traitement terminé !');
      modal.remove();

    } catch (err) {
      alert('Erreur : ' + err.message);

    } finally {
      overlay.classList.add('hidden');
    }
  };

  /* ----------- Fermer --------------------------------------------------- */
  modal.querySelector('#pkg-close').onclick = () => modal.remove();
}

