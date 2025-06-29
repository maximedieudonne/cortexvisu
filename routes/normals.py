# routes/normals.py
from fastapi import APIRouter, Body
import os, json
from pathlib import Path
from tools.parser import load_normals_csv

router = APIRouter()

NORMAL_OUTPUT = Path("public/normals")
ASSOCIATIONS_FILE = NORMAL_OUTPUT / "associations.json"
NORMAL_OUTPUT.mkdir(parents=True, exist_ok=True)


# ------- 1) Charger un CSV (ou plusieurs) et renvoyer les normales ---------
@router.post("/load-normals-paths")
def load_normals_from_paths(payload: dict = Body(...)):
    paths: list[str] = payload.get("paths", [])
    out = []
    for p in paths:
        try:
            normals = load_normals_csv(p)
            out.append({
                "name": os.path.basename(p),
                "path": p,
                "normals": normals
            })
        except Exception as e:
            out.append({
                "name": os.path.basename(p),
                "path": p,
                "error": str(e)
            })
    return out


# ------- 2) Associer des CSV de normales à des meshes ----------------------
@router.post("/associate-normals")
def associate_normals(payload: dict = Body(...)):
    """
    Payload attendu :
    {
        \"meshes\":   [{\"id\": \"mesh-uuid\", ...}, ...],
        \"normals\":  [{\"mesh_id\": \"mesh-uuid\", \"json\": {...}}, ...]
    }
    -> mapping { mesh_id: [json_normal, ...] }
    """
    mapping = {}
    meshes   = payload.get("meshes", [])
    normals  = payload.get("normals", [])

    for mesh in meshes:
        mesh_id = mesh["id"]
        mapping[mesh_id] = [
            n["json"] for n in normals if n["mesh_id"] == mesh_id
        ]

    # on ne garde que les meshes ayant au moins une normale associée
    mapping = {k: v for k, v in mapping.items() if v}

    # persistance facultative (comme pour les textures)
    if mapping:
        with open(ASSOCIATIONS_FILE, "w") as f:
            json.dump(mapping, f, indent=2)

    return {"status": "success", "mapping": mapping}
