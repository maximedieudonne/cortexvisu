from fastapi import APIRouter, Body, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from pathlib import Path
from typing import List
import uuid
import os
import json

from tools.parser import load_mesh, load_scalar_data
from tools.curvature import compute_curvature
from tools.mesh_to_threejs_json import generate_threejs_json

router = APIRouter()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

MESH_OUTPUT = Path("public/meshes")
MESH_OUTPUT.mkdir(parents=True, exist_ok=True)

TEXTURE_OUTPUT = Path("public/textures")
ASSOCIATIONS_FILE = TEXTURE_OUTPUT / "associations.json"


class MeshPathRequest(BaseModel):
    path: str


@router.post("/load-mesh-from-path")
def load_mesh_from_path(req: MeshPathRequest):
    path = req.path
    try:
        vertices, faces = load_mesh(path)
        return JSONResponse({"vertices": vertices, "faces": faces})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=400)


@router.post("/upload-mesh")
async def upload_mesh(payload: dict = Body(...)):
    results = []
    mesh_paths = payload.get("mesh_paths", [])

    for mesh_path in mesh_paths:
        try:
            json_path = generate_threejs_json(Path(mesh_path), MESH_OUTPUT)
            results.append({
                "mesh_path": mesh_path,
                "json": json_path.name
            })
        except Exception as e:
            results.append({
                "mesh_path": mesh_path,
                "error": str(e)
            })

    return results


@router.post("/delete-meshes")
def delete_meshes(ids: List[str] = Body(...)):
    deleted = []
    errors = []

    for mesh_id in ids:
        matching_files = list(UPLOAD_DIR.glob(f"{mesh_id}_*"))
        if not matching_files:
            errors.append({"id": mesh_id, "error": "Non trouvé"})
            continue

        for f in matching_files:
            try:
                f.unlink()
                deleted.append(mesh_id)
            except Exception as e:
                errors.append({"id": mesh_id, "error": str(e)})

    return {
        "deleted": deleted,
        "errors": errors
    }




