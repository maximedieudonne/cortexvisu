from fastapi import APIRouter, Form
from fastapi.responses import JSONResponse
from typing import List
from pathlib import Path

from tools.curvature import compute_curvature
from tools.parser import load_scalar_data

UPLOAD_DIR = Path("uploads")

router = APIRouter()


@router.post("/compute-curvature")
async def compute_curvature_batch(mesh_ids: List[str] = Form(...)):
    results = []

    for mesh_id in mesh_ids:
        matching = list(UPLOAD_DIR.glob(f"{mesh_id}_*"))
        if not matching:
            continue

        mesh_path = str(matching[0])

        try:
            curvature_path = compute_curvature(mesh_path)
            scalars = load_scalar_data(curvature_path)

            results.append({
                "id": mesh_id,
                "scalars": scalars,
                "message": f"Courbure calculée pour {mesh_path}"
            })

        except Exception as e:
            results.append({
                "id": mesh_id,
                "error": str(e)
            })

    return JSONResponse(content=results)
