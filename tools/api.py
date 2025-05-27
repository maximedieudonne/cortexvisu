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



app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@app.get("/api/ping")
def ping():
    return {"status": "ok", "message": "CortexVisu backend fonctionne 🎉"}

@app.post("/api/upload-mesh")
async def upload_mesh(files: List[UploadFile] = File(...)):
    result = []

    for file in files:
        file_id = str(uuid.uuid4())
        filename = f"{file_id}_{file.filename}"
        filepath = UPLOAD_DIR / filename

        with open(filepath, "wb") as f:
            content = await file.read()
            f.write(content)

        vertices, faces = load_mesh(str(filepath))
        result.append({
            "id": file_id,
            "name": file.filename,
            "vertices": vertices,
            "faces": faces,
            "path": str(filepath)
        })

    return JSONResponse(result)

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




# 📁 Simulation de sélection de dossier (à adapter si besoin)
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


# 📥 Importation de fichiers sélectionnés à partir du dossier + ajout à la base
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


# Static file serving
app.mount("/", StaticFiles(directory=Path("dist"), html=True), name="static")
