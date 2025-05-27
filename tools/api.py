from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from tools.parser import load_mesh, load_scalar_data
from tools.curvature import compute_curvature
from pathlib import Path

app = FastAPI()

# Autoriser le frontend local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/ping")
def ping():
    return {"status": "ok", "message": "CortexVisu backend fonctionne 🎉"}

@app.post("/api/upload-mesh")
async def upload_mesh(file: UploadFile = File(...)):
    content = await file.read()
    with open("temp_mesh.gii", "wb") as f:
        f.write(content)
    
    vertices, faces = load_mesh("temp_mesh.gii")
    return JSONResponse({"vertices": vertices, "faces": faces})

@app.post("/api/upload-texture")
async def upload_texture(file: UploadFile = File(...)):
    content = await file.read()
    with open("temp_texture.gii", "wb") as f:
        f.write(content)
    
    scalars = load_scalar_data("temp_texture.gii")
    return JSONResponse({"scalars": scalars})

@app.post("/api/compute-curvature")
def compute_curvature_endpoint():
    path = compute_curvature("temp_mesh.gii")  # public/curvature.gii
    scalars = load_scalar_data(path)
    return {"scalars": scalars, "message": "Courbure calculée et chargée "}


# Ce bloc doit venir après toutes les routes
app.mount("/", StaticFiles(directory=Path("dist"), html=True), name="static")
