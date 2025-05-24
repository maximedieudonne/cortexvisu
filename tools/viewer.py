import json
from pathlib import Path
from tools.parser import load_mesh, load_scalar_data
import matplotlib.pyplot as plt

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

def save_histogram(scalars, output_path="public/histogram.png"):
    plt.figure(figsize=(3, 2))
    plt.hist(scalars, bins=100, color='skyblue', edgecolor='black')
    plt.xlabel("Valeur scalaire")
    plt.ylabel("Fréquence")
    plt.tight_layout()
    plt.savefig(output_path, dpi=100)
    plt.close()



