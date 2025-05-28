import json
import uuid
from pathlib import Path
from tools.parser import load_mesh  


def generate_threejs_json(gii_path: Path, output_dir: Path) -> Path:
    """
    Convertit un fichier .gii contenant un maillage (vertices + faces)
    en un fichier JSON compatible BufferGeometry (Three.js).
    
    Args:
        gii_path (Path): chemin vers le fichier GIFTI
        output_dir (Path): dossier de sortie pour le .json

    Returns:
        Path: chemin complet du fichier JSON généré
    """
    # Charge les données du maillage
    vertices, faces = load_mesh(str(gii_path))

    # Aplatissement des listes (Three.js attend une liste plate de coordonnées)
    flat_vertices = [coord for vertex in vertices for coord in vertex]
    flat_faces = [index for face in faces for index in face]

    # Création du JSON BufferGeometry
    data = {
        "metadata": {
            "version": 4.5,
            "type": "BufferGeometry",
            "generator": "generate_threejs_json"
        },
        "data": {
            "attributes": {
                "position": {
                    "itemSize": 3,
                    "type": "Float32Array",
                    "array": flat_vertices,
                    "normalized": False
                }
            },
            "index": {
                "type": "Uint32Array",
                "array": flat_faces
            }
        }
    }

    # Génère un nom unique basé sur l'input
    output_filename = f"{uuid.uuid4().hex}_{gii_path.stem}.json"
    output_path = output_dir / output_filename

    # Sauvegarde du JSON
    with open(output_path, "w") as f:
        json.dump(data, f)

    return output_path
