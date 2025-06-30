
from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any
import importlib
from pydantic import BaseModel
from pathlib import Path

router = APIRouter()

class PackageRequest(BaseModel):
    package_name: str

imported_functions: Dict[str, Dict[str, Any]] = {}
current_package: str = None

@router.post("/import-package/")
def import_package(payload: PackageRequest):
    global imported_functions, current_package
    try:
        print(">>> Reçu :", payload.package_name)  # log console

        package_name = payload.package_name
        registry = importlib.import_module(f"{package_name}.api_registry")

        if hasattr(registry, "EXPORTED_FUNCTIONS"):
            imported_functions = registry.EXPORTED_FUNCTIONS
            current_package = package_name
            return {
                "status": "success",
                "functions": [
                    {
                        "name": name,
                        "label": meta.get("label", name),
                        "description": meta.get("description", "")
                    } for name, meta in imported_functions.items()
                ]
            }
        else:
            raise ImportError("EXPORTED_FUNCTIONS not found in package.")
    except Exception as e:
        print(">>> ERREUR import_package:", str(e))  # 🧪
        raise HTTPException(status_code=400, detail=str(e))




@router.post("/run-function/")
def run_function(name: str = Body(...), mesh_path: str = Body(...)):
    if name not in imported_functions:
        raise HTTPException(status_code=404, detail=f"Fonction '{name}' non trouvée.")

    func = imported_functions[name]["function"]

    try:
        # Extraire le nom du maillage sans extension
        mesh_filename = Path(mesh_path).stem

        # Créer un dossier public/nom_maillage/
        output_dir = Path("public") / mesh_filename
        output_dir.mkdir(parents=True, exist_ok=True)

        # Appeler la fonction en lui passant mesh_path et le dossier de sortie
        result = func(mesh_path, str(output_dir))

        return {
            "result": result,
            "output_dir": str(output_dir)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur d'exécution: {e}")



