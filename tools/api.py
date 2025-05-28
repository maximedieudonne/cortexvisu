from fastapi import FastAPI, File, UploadFile, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from typing import List
import uuid, os
from tools.parser import load_mesh, load_scalar_data
from tools.curvature import compute_curvature
from fastapi import Body
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from tools.mesh_to_threejs_json import generate_threejs_json
from pathlib import Path

import json

app = FastAPI()


# Configurer correctement CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Autoriser l'origine de ton frontend
    allow_credentials=True,
    allow_methods=["*"],  # Autoriser toutes les méthodes HTTP
    allow_headers=["*"],  # Autoriser tous les en-têtes
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
MESH_OUTPUT = Path("public/meshes")
MESH_OUTPUT.mkdir(parents=True, exist_ok=True)
TEXTURE_OUTPUT = Path("public/textures")
TEXTURE_OUTPUT.mkdir(parents=True, exist_ok=True)

MAPPING_FILE = Path("public/mesh_texture_map.json")
if not MAPPING_FILE.exists():
    MAPPING_FILE.write_text(json.dumps({}))  # fichier vide par défaut

@app.get("/api/ping")
def ping():
    return {"status": "ok", "message": "CortexVisu backend fonctionne 🎉"}



@app.post("/api/upload-mesh")
async def upload_mesh(files: List[UploadFile] = File(...)):
    results = []

    for file in files:
        temp_path = UPLOAD_DIR / file.filename
        with open(temp_path, "wb") as f:
            f.write(await file.read())

        json_path = generate_threejs_json(temp_path, MESH_OUTPUT)

        results.append({
            "name": file.filename,
            "json": json_path.name
        })

    return results 



@app.post("/api/upload-texture")
async def upload_texture(files: List[UploadFile] = File(...)):
    result = []

    for file in files:
        file_id = str(uuid.uuid4())
        filename = f"{file_id}_{file.filename}"
        filepath = UPLOAD_DIR / filename

        with open(filepath, "wb") as f:
            content = await file.read()
            f.write(content)

        scalars = load_scalar_data(str(filepath))
        result.append({
            "id": file_id,
            "name": file.filename,
            "scalars": scalars,
            "path": str(filepath)
        })

    return JSONResponse(result)

@app.post("/api/compute-curvature")
async def compute_curvature_batch(mesh_ids: List[str] = Form(...)):
    results = []
    for mesh_id in mesh_ids:
        # Retrouver le fichier associé dans UPLOAD_DIR
        matching = list(UPLOAD_DIR.glob(f"{mesh_id}_*"))
        if not matching:
            continue

        mesh_path = str(matching[0])
        curvature_path = compute_curvature(mesh_path)
        scalars = load_scalar_data(curvature_path)

        results.append({
            "id": mesh_id,
            "scalars": scalars,
            "message": f"Courbure calculée pour {mesh_path}"
        })

    return results




# Simulation de sélection de dossier (à adapter si besoin)
@app.get("/api/select-folder")
def select_folder():
    folder = Path("data")  # Change vers le dossier réel à scanner récursivement
    if not folder.exists():
        return JSONResponse(status_code=404, content={"error": "Dossier non trouvé."})

    files = [str(p.relative_to(folder)) for p in folder.rglob("*") if p.is_file()]
    return {
        "path": str(folder.resolve()),
        "files": files
    }


#  Importation de fichiers sélectionnés à partir du dossier + ajout à la base
@app.post("/api/import-meshes-from-folder")
def import_meshes_from_folder(payload: dict = Body(...)):
    folder_path = Path(payload.get("folder", ""))
    filenames = payload.get("files", [])

    if not folder_path.exists():
        return JSONResponse(status_code=400, content={"error": "Dossier non valide."})

    result = []
    for filename in filenames:
        file_path = folder_path / filename
        if not file_path.exists() or not file_path.is_file():
            continue

        file_id = str(uuid.uuid4())
        target_path = UPLOAD_DIR / f"{file_id}_{file_path.name}"
        with open(file_path, "rb") as src, open(target_path, "wb") as dst:
            dst.write(src.read())

        try:
            vertices, faces = load_mesh(str(target_path))
        except Exception as e:
            continue  # On saute les fichiers invalides

        result.append({
            "id": file_id,
            "name": file_path.name,
            "vertices": vertices,
            "faces": faces,
            "path": str(target_path)
        })

    return JSONResponse(result)



@app.post("/api/delete-meshes")
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




@app.post("/api/list-folder-files")
async def list_folder_files(request: Request):
    try:
        data = await request.json()
        folder_path = data.get("path")

        if not folder_path or not os.path.isdir(folder_path):
            return JSONResponse(status_code=400, content={"error": "Chemin invalide ou dossier introuvable."})

        all_files = []
        for root, dirs, files in os.walk(folder_path):
            for file in files:
                # On retourne des chemins relatifs par rapport au dossier racine fourni
                relative_path = os.path.relpath(os.path.join(root, file), start=folder_path)
                all_files.append(relative_path)

        return {"files": all_files}

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Erreur serveur : {str(e)}"})


@app.post("/api/load-texture-paths")
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

@app.post("/api/read-file")
async def read_file(payload: dict = Body(...)):
    file_path = Path(payload.get("path", ""))
    if not file_path.exists() or not file_path.is_file():
        return JSONResponse(status_code=400, content={"error": "Fichier introuvable"})

    return file_path.read_bytes()


@app.post("/api/load-and-associate-textures")
async def load_and_associate_textures(payload: dict = Body(...)):
    textures = payload.get("textures", [])  # [{path, name}]
    meshes = payload.get("meshes", [])      # [{id, name}]

    if not textures or not meshes:
        return JSONResponse(status_code=400, content={"error": "Textures ou meshes manquants"})

    try:
        mapping = json.loads(MAPPING_FILE.read_text())
    except Exception:
        mapping = {}

    response = []

    for i, texture in enumerate(textures):
        path = Path(texture["path"])
        if not path.exists():
            continue

        name = path.stem
        mesh_idx = 0 if len(meshes) == 1 else i
        mesh_id = meshes[mesh_idx]["id"]

        try:
            scalars = load_scalar_data(str(path))
        except Exception as e:
            continue

        json_path = TEXTURE_OUTPUT / f"{mesh_id}_{name}.json"
        json_path.write_text(json.dumps({"scalars": scalars}))

        if mesh_id not in mapping:
            mapping[mesh_id] = []
        mapping[mesh_id].append(str(json_path.name))

        response.append({
            "mesh_id": mesh_id,
            "texture_file": json_path.name,
            "texture_name": texture["name"]
        })

    MAPPING_FILE.write_text(json.dumps(mapping, indent=2))
    return response


# Static file serving
app.mount("/", StaticFiles(directory=Path("dist"), html=True), name="static")
