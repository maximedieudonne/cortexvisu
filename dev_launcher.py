import subprocess
import webbrowser
from tools.viewer import generate_json
from pathlib import Path

# Génération du fichier JSON
surface = "data/mesh_02.gii"
texture = "data/texture_02.gii"
output = Path("public/data.json")
generate_json(surface, texture, output)
print(f"data.json généré à {output.resolve()}")

# Lancement de Vite
#try:
#    print("Lancement du serveur Vite (npm run dev)")
#    subprocess.Popen(["npm", "run", "dev"])
#    webbrowser.open("http://localhost:5173")
#except Exception as e:
#    print("Erreur lancement Vite :", e)