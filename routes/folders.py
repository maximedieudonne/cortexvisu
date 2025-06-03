from fastapi import APIRouter, Body, Request
from fastapi.responses import JSONResponse
from pathlib import Path
import os
import uuid
from tools.parser import load_mesh

router = APIRouter()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@router.get("/select-folder")
def select_folder():
    folder = Path("data")  # Chemin de base configurable
    if not folder.exists():
        return JSONResponse(status_code=404, content={"error": "Dossier non trouvé."})

    files = [str(p.relative_to(folder)) for p in folder.rglob("*") if p.is_file()]
    return {
        "path": str(folder.resolve()),
        "files": files
    }


@router.post("/import-meshes-from-folder")
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

        try:
            with open(file_path, "rb") as src, open(target_path, "wb") as dst:
                dst.write(src.read())

            vertices, faces = load_mesh(str(target_path))

            result.append({
                "id": file_id,
                "name": file_path.name,
                "vertices": vertices,
                "faces": faces,
                "path": str(target_path)
            })

        except Exception as e:
            print(f"Erreur lors du chargement de {filename} : {e}")
            continue

    return JSONResponse(result)


@router.post("/list-folder-files")
async def list_folder_files(request: Request):
    try:
        data = await request.json()
        folder_path = data.get("path")

        if not folder_path or not os.path.isdir(folder_path):
            return JSONResponse(status_code=400, content={"error": "Chemin invalide ou dossier introuvable."})

        all_files = []
        for root, dirs, files in os.walk(folder_path):
            for file in files:
                relative_path = os.path.relpath(os.path.join(root, file), start=folder_path)
                all_files.append(relative_path)

        return {"files": all_files}

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Erreur serveur : {str(e)}"})


@router.post("/read-file")
async def read_file(payload: dict = Body(...)):
    file_path = Path(payload.get("path", ""))
    if not file_path.exists() or not file_path.is_file():
        return JSONResponse(status_code=400, content={"error": "Fichier introuvable"})

    return file_path.read_bytes()
