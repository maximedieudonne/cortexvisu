@echo off
echo Activation de l'environnement Conda et lancement du mode développement...

REM Lancer Vite (frontend) dans une nouvelle console et attendre qu'il soit prêt avant de continuer
start cmd /k "conda activate d:\Callisto\repo\cortexvisu\.conda && npm run dev"

REM Lancer FastAPI (backend) dans une deuxième console, mais attendre quelques secondes
timeout /t 5

start cmd /k "conda activate d:\Callisto\repo\cortexvisu\.conda && python -m uvicorn tools.api:app --reload --port 8000"

echo Mode développement lancé !
pause
