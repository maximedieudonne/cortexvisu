#!/bin/bash

echo "Lancement du mode développement CortexVisu..."

# Activer l'environnement (modifie le nom/env si nécessaire)
source ~/miniconda3/etc/profile.d/conda.sh
conda activate cortexvisu

# Lancer frontend en arrière-plan
gnome-terminal -- bash -c "npm run dev; exec bash"

# Lancer backend
gnome-terminal -- bash -c "python -m uvicorn tools.api:app --reload --port 8000; exec bash"

echo "Frontend & Backend lancés."
