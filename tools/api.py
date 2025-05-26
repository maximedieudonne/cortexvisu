from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from tools.parser import load_mesh, load_scalar_data
from pathlib import Path

app = FastAPI()

# (Optionnel : à retirer si tu ne bosses plus avec vite dev)
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

# Sert les fichiers Vite buildés
app.mount("/", StaticFiles(directory=Path("dist"), html=True), name="static")
