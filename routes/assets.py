from fastapi import APIRouter, HTTPException, Query
from pathlib import Path
import os

router = APIRouter()

# Répertoire racine où les résultats sont écrits
PUBLIC_DIR = Path("public")


@router.get("/mesh-assets/")
def list_mesh_assets(
    mesh: str = Query(
        ...,
        description=(
            "Chemin absolu (ou relatif) du maillage .gii ; "
            "ex. data/sub-001/surf/lh.white.gii"
        ),
    )
):
    """
    Retourne les textures (.gii) et normales (.csv) associées **au sujet**
    du mesh donné. Les fichiers sont cherchés dans :

        public/<subject>/cortexanalyzer/
    """
    mesh_path = Path(mesh).expanduser()

    # ► Si l’API reçoit juste "lh.white" (ancien usage) on lève une erreur explicite
    if mesh_path.suffix.lower() != ".gii" or not mesh_path.exists():
        raise HTTPException(404, f"Chemin mesh non trouvé ou invalide : {mesh}")

    # Sujet = dossier parent du dossier surf/  →  …/<sub-001>
    try:
        subject_dir = mesh_path.parent.parent          # ..../sub-001
    except IndexError:
        raise HTTPException(400, "Structure de chemin mesh inattendue.")

    # Répertoire où les étapes déposent leurs sorties
    out_dir = PUBLIC_DIR / subject_dir.name / "cortexanalyzer"

    textures: list[dict] = []
    normals:  list[dict] = []

    if out_dir.exists():
        for f in out_dir.iterdir():
            if f.is_file():
                if f.suffix.lower() == ".gii":
                    textures.append({"name": f.name, "path": str(f)})
                elif f.suffix.lower() == ".csv":
                    normals.append({"name": f.name, "path": str(f)})

    return {"textures": textures, "normals": normals}
