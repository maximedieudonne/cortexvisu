@echo off
echo Activation de l'environnement Conda et lancement du mode développement...

REM Lancer Vite (frontend) dans une console séparée
start cmd /k "conda activate d:\Callisto\repo\cortexvisu\.conda && npm run dev"

REM Lancer FastAPI (backend) dans une deuxième console
start cmd /k "conda activate d:\Callisto\repo\cortexvisu\.conda && python -m uvicorn tools.api:app --reload --port 8000"

echo Mode développement lancé !
pause
