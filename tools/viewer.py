import json
from pathlib import Path
from tools.parser import load_mesh, load_scalar_data

def generate_json(surface_path, scalar_path, output_path):
    vertices, faces = load_mesh(surface_path)
    scalars = load_scalar_data(scalar_path)

    data = {
        "vertices": vertices,
        "faces": faces,
        "scalars": scalars,
        "title": Path(surface_path).stem
    }

    with open(output_path, 'w') as f:
        json.dump(data, f)

if __name__ == "__main__":
    generate_json("lh.pial.gii", "curvature.gii", "../public/data.json")
    print("✅ Données exportées dans public/data.json")