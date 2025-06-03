from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse
from pathlib import Path
import os
import json
from tools.parser import load_scalar_data

router = APIRouter()

TEXTURE_OUTPUT = Path("public/textures")
ASSOCIATIONS_FILE = TEXTURE_OUTPUT / "associations.json"
TEXTURE_OUTPUT.mkdir(parents=True, exist_ok=True)


@router.post("/upload-texture")
async def upload_texture(payload: dict = Body(...)):
    result = []

    texture_paths = payload.get("texture_paths", [])
    for texture_path in texture_paths:
        try:
            scalars = load_scalar_data(texture_path)
            result.append({
                "texture_path": texture_path,
                "scalars": scalars  
            })
        except Exception as e:
            result.append({
                "texture_path": texture_path,
                "error": str(e)
            })

    return JSONResponse(result)


@router.post("/load-texture-paths")
def load_textures_from_paths(payload: dict = Body(...)):
    paths = payload.get("paths", [])
    result = []

    for path in paths:
        try:
            scalars = load_scalar_data(path)
            result.append({
                "name": os.path.basename(path),
                "path": path,
                "scalars": scalars
            })
        except Exception as e:
            result.append({
                "name": os.path.basename(path),
                "path": path,
                "error": str(e)
            })

    return result


@router.post("/associate-textures")
async def associate_textures(payload: dict = Body(...)):
    mapping = {}
    
    meshes = payload.get("meshes", [])
    textures = payload.get("textures", [])

    for mesh in meshes:
        mesh_id = mesh["id"]
        associated_textures = []

        for texture in textures:
            if texture["mesh_id"] == mesh_id:
                associated_textures.append(texture["json"])

        if associated_textures:
            mapping[mesh_id] = associated_textures

    with open(ASSOCIATIONS_FILE, "w") as f:
        json.dump(mapping, f, indent=2)

    return {"status": "success", "mapping": mapping}
