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
    """Exécute `req.name` sur chaque mesh listé dans `mesh_paths`."""
    if req.name not in imported_functions:
        raise HTTPException(404, f"Fonction '{req.name}' inconnue.")

    func = imported_functions[req.name]["function"]
    base_kwargs = _match_yaml_for(req.name)       # valeurs par défaut YAML

    results = []
    for mesh_path in req.mesh_paths:
        mesh_stem = Path(mesh_path).stem

        # output_dir : UI > YAML > /public/<mesh>
        out_dir = Path(
            req.args_user.get("output_dir")
            or base_kwargs.get("output_dir")
            or Path("public") / mesh_stem
        )
        out_dir.mkdir(parents=True, exist_ok=True)

        # assemblage des kwargs (ordre UI > YAML)
        kwargs = {**base_kwargs, **req.args_user,
                  "mesh_path": mesh_path,
                  "output_dir": str(out_dir)}

        try:
            result = func(**kwargs)  # nouvelle signature (kw‑only)
        except TypeError:
            # compat: anciennes signatures (mesh_path, output_dir)
            result = func(mesh_path, str(out_dir))

        results.append({
            "mesh": mesh_stem,
            "output_dir": str(out_dir),
            "result": result,
        })

    return {"status": "success", "results": results}
