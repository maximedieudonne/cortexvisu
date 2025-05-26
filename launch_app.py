# launch_app.py
import subprocess
import webbrowser
import time
import sys
print("Compilation du frontend...")
vite_build = subprocess.run("npm run build", shell=True)
if vite_build.returncode != 0:
    print("Échec du build Vite. Vérifie ton frontend.")
    exit(1)

print("Lancement du backend (FastAPI, sert aussi le frontend)...")

server = subprocess.Popen(f'"{sys.executable}" -m uvicorn tools.api:app --port 8000', shell=True)



# Laisser le temps au serveur de démarrer
time.sleep(2)

# Ouvrir automatiquement dans le navigateur
webbrowser.open("http://localhost:8000")

try:
    print("CortexVisu en cours d'exécution. Ctrl+C pour arrêter.")
    server.wait()
except KeyboardInterrupt:
    print("Arrêt de l'application.")
    server.terminate()
