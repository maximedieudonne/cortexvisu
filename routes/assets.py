from fastapi import APIRouter, Query
from pathlib import Path

router = APIRouter()
PUBLIC_DIR = Path("public")

@router.get("/mesh-assets/")
def list_mesh_assets(mesh: str = Query(..., description="Nom du maillage")):
    base = PUBLIC_DIR / mesh
    if not base.is_dir():
        return {"textures": [], "normals": []}

    textures = []
    normals  = []

    for f in base.iterdir():
        if f.suffix.lower() == ".gii":
            textures.append({"name": f.name, "path": str(f)})
        elif f.suffix.lower() == ".csv":
            normals.append({"name": f.name, "path": str(f)})

    return {"textures": textures, "normals": normals}

