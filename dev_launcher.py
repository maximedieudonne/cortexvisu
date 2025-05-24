import subprocess
import webbrowser
from tools.parser import load_mesh, load_scalar_data
from tools.viewer import generate_json, save_histogram
from pathlib import Path

# Génération du fichier JSON
surface = "data/mesh_02.gii"
texture = "data/texture_02.gii"
output = Path("public/data.json")
generate_json(surface, texture, output)
scalars = load_scalar_data(texture)
save_histogram(scalars)
print(f"data.json généré à {output.resolve()}")

