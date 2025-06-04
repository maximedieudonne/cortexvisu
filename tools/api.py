from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from routes import mesh, texture, folders, db_generation, compute_curvature, import_package


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(mesh.router, prefix="/api")
app.include_router(texture.router, prefix="/api")
app.include_router(folders.router, prefix="/api")
app.include_router(db_generation.router, prefix="/api")
app.include_router(compute_curvature.router, prefix="/api")
app.include_router(import_package.router, prefix="/api")

# Serve frontend static files
app.mount("/", StaticFiles(directory=Path("dist"), html=True), name="static")
