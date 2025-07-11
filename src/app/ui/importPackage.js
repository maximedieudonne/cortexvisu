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
  console.log('LEN', functions.length, functions);
  const loadedMeshes = (getMeshes() || []).map(m => ({
    path: m.path,
    label: m.name || m.path.split('/').pop()
  }));

  // Création structure modale ------------------------------------------------
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
  <div class="modal-content pkg-card">

    <button id="pkg-close" class="close-btn">✖</button>

    <!-- corps à trois colonnes -->
    <div class="pkg-body">
      <aside id="pkg-col-fn"   class="pkg-col">
        <h4>Fonctions</h4>
      </aside>

      <section id="pkg-col-mesh" class="pkg-col">
        <h4>Maillages</h4>
        <button id="pkg-mesh-all">Tout sélectionner</button>
        <ul id="pkg-mesh-list" class="checkbox-list"></ul>
      </section>

      <section id="pkg-col-arg"  class="pkg-col">
        <h4>Arguments</h4>
        <form id="pkg-arg-form"></form>
      </section>
    </div>

    <!-- footer centré -->
    <div class="pkg-footer">
      <button id="pkg-run" disabled>Run</button>
    </div>

    <div id="pkg-progress-section" class="hidden">
      <div class="progress-wrapper">
        <progress id="pkg-progress-bar" value="0" max="100"></progress>
        <div id="pkg-progress-text">Initialisation…</div>
      </div>
      <div id="pkg-log-output" class="log-box"></div>
    </div>
  </div>
`;
  
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
  const progressSection = modal.querySelector('#pkg-progress-section');
  const progressBar = modal.querySelector('#pkg-progress-bar');
  const progressText = modal.querySelector('#pkg-progress-text');
  const logBox = modal.querySelector('#pkg-log-output');
  logBox.style.whiteSpace = 'pre-line';

  progressSection.classList.remove('hidden');
  progressBar.value = 0;
  progressText.textContent = 'Initialisation…';
  logBox.textContent = '';

  const argsUser = {};
  argForm.querySelectorAll('input[data-arg]').forEach(inp => {
    argsUser[inp.name] = inp.value;
  });

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

    const { results, job_id } = await res.json();
    console.table(results);
    const startTime = Date.now();
    
    const poll = setInterval(async () => {
      try {
        const progressRes = await fetch(`/api/progress/${job_id}`);
        if (!progressRes.ok) throw new Error('Erreur progression');

        const { progress, eta, elapsed, logs } = await progressRes.json();

        progressBar.value = progress;
        progressText.textContent = `Progression : ${progress}% • Estimé : ${eta} • Écoulé : ${elapsed}`;
        logBox.textContent = logs.join('\n');
        logBox.scrollTop = logBox.scrollHeight;

        if (progress >= 100) {
          clearInterval(poll);

          for (const r of results) {
            await refreshMeshAssets({ path: r.output });
          }

          const totalElapsed = Math.floor((Date.now() - startTime) / 1000);
          progressText.textContent = `Terminé  (${progress}%) • Durée totale : ${totalElapsed}s`;
        }

      } catch (e) {
        console.error('Erreur polling :', e);
        clearInterval(poll);
        progressText.textContent = 'Erreur durant le traitement';
      }
    }, 1500);

  } catch (err) {
    alert('Erreur : ' + err.message);
    progressText.textContent = 'Erreur lors de l’envoi de la tâche.';
  }
};
}

