
from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import importlib
from pydantic import BaseModel

router = APIRouter()

class PackageRequest(BaseModel):
    package_name: str

imported_functions: Dict[str, Dict[str, Any]] = {}
current_package: str = None

@router.post("/import-package/")
def import_package(payload: PackageRequest):
    global imported_functions, current_package
    try:
        print(">>> Reçu :", payload.package_name)  # 🧪 log console

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


    

@router.get("/functions")
def list_functions():
    if not imported_functions:
        raise HTTPException(status_code=400, detail="Aucun package importé.")
    
    return [
        {
            "name": name,
            "label": meta.get("label", name),
            "description": meta.get("description", "")
        }
        for name, meta in imported_functions.items()
    ]


@router.post("/run-function/")
def run_function(name: str, mesh_data: dict):
    if name not in imported_functions:
        raise HTTPException(status_code=404, detail=f"Fonction '{name}' non trouvée.")
    
    func = imported_functions[name]["function"]
    try:
        result = func(mesh_data)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur d'exécution: {e}")

