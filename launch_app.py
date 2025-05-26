# launch_app.py
import subprocess
import webbrowser
import time
import os

# 1. Lancer le backend FastAPI
print("Démarrage du backend (FastAPI)...")
api_proc = subprocess.Popen(["uvicorn", "tools.api:app", "--port", "8000", "--reload"])

# 2. Lancer le serveur frontend (Vite)
print("Démarrage du frontend (Vite)...")
vite_proc = subprocess.Popen(["npm", "run", "dev"])

# 3. Attendre un peu le temps que les serveurs démarrent
time.sleep(3)

# 4. Ouvrir automatiquement le navigateur
print("Ouverture du navigateur...")
webbrowser.open("http://localhost:5173")

# 5. Attendre que l'utilisateur quitte
try:
    print("App en cours d'exécution. Appuyez sur Ctrl+C pour quitter.")
    api_proc.wait()
    vite_proc.wait()
except KeyboardInterrupt:
    print("\nArrêt en cours...")
    api_proc.terminate()
    vite_proc.terminate()
