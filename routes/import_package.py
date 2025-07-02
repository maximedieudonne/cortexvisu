"""FastAPI routes : import de package d’analyse, exécution batch.

Expose deux endpoints :
  • POST /import-package/          → liste les fonctions + métadonnées YAML
  • POST /run-function-batch/      → exécute une fonction sur ≥1 meshes

`run-function` (ancienne route mono‑mesh) a été retirée : le front appelle
maintenant uniquement /run-function-batch/.
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from pydantic import BaseModel
from pathlib import Path
import importlib
import re
from inspect import signature, Parameter
import yaml

from .config_loader import load_config_yaml  # utilitaire de lecture YAML

router = APIRouter()



# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class PackageRequest(BaseModel):
    package_name: str

class RunBatchRequest(BaseModel):
    name: str                     # ex : "curvature"
    mesh_paths: List[str]         # chemins complets choisis dans l’UI
    args_user: Dict[str, Any] = {}  # overrides des champs YAML

# ---------------------------------------------------------------------------
# Globals (per‑process)
# ---------------------------------------------------------------------------
imported_functions: Dict[str, Dict[str, Any]] = {}
current_package: str | None = None
package_config: Dict[str, Any] = {}            # contenu de config.yaml


# ------------------------------------------------------------------
def _build_config(step_name: str,
                  base_cfg: Dict[str, Any],
                  user_over: Dict[str, Any]) -> Dict[str, Any]:
    """Fusionne YAML + overrides interface pour CE step uniquement."""
    cfg = base_cfg.copy()
    cfg.update(user_over)           # UI > YAML
    # on range tout dans une clé step_xx_…  pour le run()
    return {step_name: cfg}
# ------------------------------------------------------------------

# ------------------------------------------------------------------ #
# Trouver la clé YAML exacte d’un step (step_01_normalvectors, …)
def _yaml_key_for(func_name: str) -> str | None:
    fn_norm = _normalize(func_name)
    for key in package_config:
        if fn_norm == _normalize(key):
            return key
    return None
# ------------------------------------------------------------------ #
def _merge_cfg(yaml_key: str,
               base: Dict[str, Any],
               user: Dict[str, Any]) -> Dict[str, Any]:
    """Construit le dict global à écrire et à passer à la fonction."""
    step_cfg = base.copy()
    step_cfg.update(user)              # UI > YAML
    return {yaml_key: step_cfg}        # ex. {'step_01_normalvectors': {...}}
# ------------------------------------------------------------------ #


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
_re_step_prefix = re.compile(r"^step_\d+_", flags=re.I)




def _normalize(txt: str) -> str:
    """Normalise les chaînes pour comparer fonction ↔ entrée YAML."""
    txt = _re_step_prefix.sub("", txt.lower())       # retire "step_01_"
    txt = re.sub(r"[^a-z0-9]", "", txt)             # garde alphanumérique
    return txt


def _match_yaml_for(func_name: str) -> Dict[str, Any]:
    """Retourne le bloc YAML correspondant à la fonction exposée."""
    fn_norm = _normalize(func_name)
    for key, val in package_config.items():
        if fn_norm == _normalize(key):
            return val or {}
    return {}

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@router.post("/import-package/")
def import_package(payload: PackageRequest):
    """Importe dynamiquement un package d’analyse et expose ses fonctions."""
    global imported_functions, current_package, package_config

    try:
        package_name = payload.package_name.strip()
        if not package_name:
            raise ValueError("Nom de package vide.")

        # 1) import du registry ------------------------------------------------
        registry = importlib.import_module(f"{package_name}.api_registry")
        if not hasattr(registry, "EXPORTED_FUNCTIONS"):
            raise ImportError("EXPORTED_FUNCTIONS non trouvé dans le package.")

        imported_functions = registry.EXPORTED_FUNCTIONS
        current_package = package_name

        # 2) lecture du YAML ---------------------------------------------------
        package_config = load_config_yaml(package_name)

        # 3) response ----------------------------------------------------------
        return {
            "status": "success",
            "functions": [
                {
                    "name": fname,
                    "label": meta.get("label", fname),
                    "description": meta.get("description", ""),
                    "step_metadata": _match_yaml_for(fname),
                }
                for fname, meta in imported_functions.items()
            ],
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/run-function-batch/")
def run_function_batch(req: RunBatchRequest):
    """
    Exécute `req.name` sur chaque mesh.
    Signature imposée :
        run(subject_input_dir, subject_output_dir, config_dict)
    """
    if req.name not in imported_functions:
        raise HTTPException(404, f"Fonction '{req.name}' inconnue.")

    func          = imported_functions[req.name]["function"]
    yaml_key      = _yaml_key_for(req.name)           # ex. step_01_normalvectors
    base_cfg_yaml = package_config.get(yaml_key, {})  # bloc YAML d’origine

    results = []

    for mesh_path in req.mesh_paths:
        mesh_path   = Path(mesh_path)                 # …/sub-001/surf/lh.white.gii
        subject_dir = mesh_path.parent.parent         # …/sub-001
        out_dir     = Path("public") / subject_dir.name / "cortexanalyzer"
        out_dir.mkdir(parents=True, exist_ok=True)

        # ---------- fusion YAML + overrides UI ----------
        step_cfg   = base_cfg_yaml.copy()
        step_cfg.update(req.args_user)                # UI > YAML
        cfg_dict   = {yaml_key: step_cfg}

        # ---------- écrire le fichier pour traçabilité ----------
        cfg_file = out_dir / "config_generated.yaml"
        with cfg_file.open("w") as f:
            yaml.safe_dump(cfg_dict, f)

        # ---------- appel unique (3 arguments obligatoires) ----------
        try:
            result = func(str(subject_dir),
                          str(out_dir),
                          cfg_dict)
        except Exception as e:
            raise HTTPException(500, f"Erreur dans {req.name}: {e}")

        results.append({
            "subject": subject_dir.name,
            "mesh":    mesh_path.name,
            "config":  str(cfg_file),
            "output":  str(out_dir),
            "result":  result,
        })

    return {"status": "success", "results": results}
