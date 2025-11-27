# launch_app.py
import os
import subprocess
import webbrowser
import time
import sys
from pathlib import Path

# Configurations
FRONTEND_DIST = Path("dist")
BACKEND_ENTRY = "tools.api:app"
PORT = 8000
URL = f"http://localhost:{PORT}"
REBUILD_FLAG = "--rebuild"

# Vérifier si on force le rebuild
force_rebuild = REBUILD_FLAG in sys.argv

def build_frontend():
    print("Compilation du frontend avec Vite...")
    result = subprocess.run("npm run build", shell=True)
    if result.returncode != 0:
        print("Échec du build frontend. Vérifie ton code.")
        sys.exit(1)
    print("Frontend compilé avec succès.")

def start_backend():
    print("Lancement du backend FastAPI...")
    return subprocess.Popen(
        f'"{sys.executable}" -m uvicorn {BACKEND_ENTRY} --port {PORT}',
        shell=True
    )

def open_browser():
    print(f"Ouverture dans le navigateur : {URL}")
    webbrowser.open(URL)

def main():
    if force_rebuild or not FRONTEND_DIST.exists():
        build_frontend()
    else:
        print("Build frontend déjà présent. Utilisation du cache.")

    server_process = start_backend()
    time.sleep(2)
    if os.environ["IN_DOCKER"].lower() != "true":
        open_browser()

    try:
        print(" CortexVisu en cours. Appuie sur Ctrl+C pour quitter.")
        server_process.wait()
    except KeyboardInterrupt:
        print("\n Arrêt de l'application...")
        server_process.terminate()

if __name__ == "__main__":
    main()
