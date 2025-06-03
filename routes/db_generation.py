from fastapi import APIRouter, Body
from pathlib import Path
from fastapi.responses import JSONResponse
import json
from tools.mesh_to_threejs_json import generate_threejs_json
from tools.parser import load_scalar_data

router = APIRouter()

MESH_OUTPUT = Path("public/meshes")
TEXTURE_OUTPUT = Path("public/textures")
ASSOCIATIONS_FILE = TEXTURE_OUTPUT / "associations.json"

MESH_OUTPUT.mkdir(parents=True, exist_ok=True)
TEXTURE_OUTPUT.mkdir(parents=True, exist_ok=True)


@router.post("/generate-database")
async def generate_database(data: dict = Body(...)):
    mesh_paths = data.get("meshes", [])
    texture_paths = data.get("textures", [])

    if not mesh_paths or not texture_paths:
        return JSONResponse(status_code=400, content={
            "error": "Les chemins des maillages ou des textures sont manquants."
        })

    mesh_jsons = []
    texture_jsons = []

    # Générer les JSON de maillages
    for mesh_path in mesh_paths:
        try:
            json_path = generate_threejs_json(Path(mesh_path), MESH_OUTPUT)
            mesh_jsons.append({
                "mesh_path": mesh_path,
                "json": json_path.name
            })
        except Exception as e:
            print(f"Erreur lors de la génération du maillage pour {mesh_path}: {e}")

    # Générer les JSON de textures
    for texture_path in texture_paths:
        try:
            scalars = load_scalar_data(texture_path)
            texture_name = Path(texture_path).stem

            texture_json_path = TEXTURE_OUTPUT / f"{texture_name}.json"
            texture_json_path.write_text(json.dumps({"scalars": scalars}))

            texture_jsons.append({
                "texture_path": texture_path,
                "json": texture_json_path.name
            })
        except Exception as e:
            print(f"Erreur lors de la génération de la texture pour {texture_path}: {e}")

    # Création de la structure d'association maillages ↔ textures
    associations = {}
    for mesh_json in mesh_jsons:
        associations[mesh_json["mesh_path"]] = []

    for texture_json in texture_jsons:
        texture_path = texture_json["texture_path"]
        for mesh_json in mesh_jsons:
            # Pour simplifier, on associe chaque texture à tous les maillages
            associations[mesh_json["mesh_path"]].append(texture_json["json"])

    ASSOCIATIONS_FILE.write_text(json.dumps(associations, indent=2))

    return JSONResponse({
        "meshes": mesh_jsons,
        "textures": texture_jsons,
        "associations": associations
    })
