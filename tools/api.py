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
from pydantic import BaseModel
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

ASSOCIATIONS_FILE = Path("public/textures/associations.json")


@app.get("/api/ping")
def ping():
    return {"status": "ok", "message": "CortexVisu backend fonctionne "}


class MeshPathRequest(BaseModel):
    path: str

@app.post("/api/load-mesh-from-path")
def load_mesh_from_path(req: MeshPathRequest):
    path = req.path
    try:
        vertices, faces = load_mesh(path)
        return JSONResponse({"vertices": vertices, "faces": faces})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=400)
    


@app.post("/api/upload-mesh")
async def upload_mesh(payload: dict = Body(...)):
    results = []

    # Récupération des chemins des fichiers .gii depuis le payload
    mesh_paths = payload.get("mesh_paths", [])

    # Traitement des maillages
    for mesh_path in mesh_paths:
        json_path = generate_threejs_json(Path(mesh_path), MESH_OUTPUT)

        results.append({
            "mesh_path": mesh_path,
            "json": json_path.name
        })

    return results




@app.post("/api/upload-texture")
async def upload_texture(payload: dict = Body(...)):
    result = []

    # Récupération des chemins des fichiers de texture
    texture_paths = payload.get("texture_paths", [])

    for texture_path in texture_paths:
        # Extraction des scalars à partir du fichier de texture
        try:
            scalars = load_scalar_data(texture_path)
            # Création du JSON pour chaque texture
            json_path = TEXTURE_OUTPUT / f"{Path(texture_path).stem}.json"
            json_path.write_text(json.dumps({"scalars": scalars}))

            result.append({
                "texture_path": texture_path,
                "json": json_path.name
            })
        except Exception as e:
            result.append({
                "texture_path": texture_path,
                "error": str(e)
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


@app.post("/api/associate-textures")
async def associate_textures(payload: dict = Body(...)):
    mapping = {}
    
    # Récupération des données d'association (meshes et textures)
    meshes = payload.get("meshes", [])
    textures = payload.get("textures", [])

    for mesh in meshes:
        mesh_id = mesh["id"]
        associated_textures = []

        for texture in textures:
            # Si une texture est associée au mesh, on ajoute son chemin
            if texture["mesh_id"] == mesh_id:
                associated_textures.append(texture["json"])

        if associated_textures:
            mapping[mesh_id] = associated_textures

    # Sauvegarde de l'association dans un fichier JSON
    association_path = Path("public/mesh_texture_map.json")
    with open(association_path, "w") as f:
        json.dump(mapping, f, indent=2)

    return {"status": "success", "mapping": mapping}

@app.post("/api/generate-database")
async def generate_database(data: dict = Body(...)):
    mesh_paths = data.get("meshes", [])
    texture_paths = data.get("textures", [])

    if not mesh_paths or not texture_paths:
        return JSONResponse(status_code=400, content={"error": "Les chemins des maillages ou des textures sont manquants."})

    # Générer les fichiers JSON pour les maillages
    mesh_jsons = []
    for mesh_path in mesh_paths:
        try:
            # Générer le fichier JSON pour chaque maillage
            json_path = generate_threejs_json(Path(mesh_path), MESH_OUTPUT)
            mesh_jsons.append({
                "mesh_path": mesh_path,
                "json": json_path.name
            })
        except Exception as e:
            print(f"Erreur lors de la génération du maillage pour {mesh_path}: {e}")

    # Générer les fichiers JSON pour les textures
    texture_jsons = []
    for texture_path in texture_paths:
        try:
            # Charger les données de texture
            scalars = load_scalar_data(texture_path)
            texture_name = Path(texture_path).stem

            # Créer le fichier JSON pour chaque texture
            texture_json_path = TEXTURE_OUTPUT / f"{texture_name}.json"
            texture_json_path.write_text(json.dumps({"scalars": scalars}))

            texture_jsons.append({
                "texture_path": texture_path,
                "json": texture_json_path.name
            })
        except Exception as e:
            print(f"Erreur lors de la génération de la texture pour {texture_path}: {e}")

    # Mettre à jour le fichier associations.json avec les textures et les maillages
    associations = {}
    for mesh_json in mesh_jsons:
        associations[mesh_json["mesh_path"]] = []

    for texture_json in texture_jsons:
        texture_path = texture_json["texture_path"]
        # Associer la texture au maillage ici (ex: simple association 1-1 pour l'exemple)
        for mesh_json in mesh_jsons:
            if mesh_json["mesh_path"] not in associations:
                associations[mesh_json["mesh_path"]] = []
            associations[mesh_json["mesh_path"]].append(texture_json["json"])

    # Sauvegarder les associations dans le fichier JSON
    ASSOCIATIONS_FILE.write_text(json.dumps(associations, indent=2))

    return JSONResponse({
        "meshes": mesh_jsons,
        "textures": texture_jsons,
        "associations": associations
    })

# Static file serving
app.mount("/", StaticFiles(directory=Path("dist"), html=True), name="static")
