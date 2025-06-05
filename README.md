# CortexVisu

**CortexVisu** est une application de visualisation interactive de maillages 3D du cortex cérébral (format GIfTI `.gii`) avec :

- Colorimétrie dynamique (colormaps, plage personnalisée)
- Histogramme interactif des valeurs scalaires
- Options d’affichage (arêtes, wireframe, fond)
- Outils de dessin de texture manuelle
- Interface utilisateur simple et personnalisable

---

## Aperçu


![alt text](https://github.com/maximedieudonne/cortexvisu/blob/master/asset/screen.JPG)

---

## Installation

### 1. Fork et clone

```bash
git clone {ton fork}
cd cortexvisu
```

### 2. Installer Python + dépendances backend

#### Option 1 (recommandée) : via Conda

```bash
conda env create -f environment.yml
conda activate cortexvisu
```

#### Option 2 : via pip (si tu n’utilises pas Conda)

```bash
pip install -r requirements.txt
```

### 3. Installer Node.js + dépendances frontend

Si npm ou node ne sont pas installés : Télécharger depuis https://nodejs.org

Ensuite, dans le dossier du projet :

```bash
npm install
```

## Lancement de l'application

En local (tout-en-un)

```bash
python launch_app.py
```

Cela : 
- Compile le frontend (vite build)
- Lance le backend FastAPI (uvicorn)
- Ouvre automatiquement le navigateur à http://localhost:8000


### mode dev : 

window : double clic sur dev.bat puis aller a l'adresse http://localhost:5173/
linux : lancer dev.sh (apres avoir ajouter les droit d'execution chmod x...)
```bash
npm run dev
python -m uvicorn tools.api:app --reload --port 8000
```

### mode user :
D:/Callisto/repo/cortexvisu/.conda/python.exe d:/Callisto/repo/cortexvisu/launch_app.py --rebuild