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


## Installer et lancer l'application

### Option 1 : Lancer via Docker

Lancer les commandes suivantes de votre terminal : 
Pour construire l'image docker (à faire un fois)
```bash
git clone https://github.com/maximedieudonne/cortexvisu.git
cd cortexvisu
docker build -t cortexvisu .
```
Pour lancer l'image : 
```
docker run -d --name cortexvisu -p 8000:8000 -v [YOUR LOCAL DATA FOLDER PATH]:/data cortexvisu
```
[YOUR LOCAL DATA FOLDER PATH] est votre dossier ou se trouve votre base de données à visualiser (meshes + textures).


Puis allez dans votre navigateur web à l'adresse `localhost:8000`


### Option 2 : Lancer via le git clone

#### 1. Clone le repo

```bash
git clone https://github.com/maximedieudonne/cortexvisu.git
cd cortexvisu
```

#### 2. Installer Python + dépendances backend

Vous pouvez le faire via Conda ou via pip
conda : 
```bash
conda env create -f environment.yml
conda activate cortexvisu
```
pip:
```bash
pip install -r requirements.txt
```

#### 3. Installer Node.js + dépendances frontend

Si npm ou node ne sont pas installés : Télécharger depuis https://nodejs.org

Ensuite, dans le dossier du projet :

```bash
npm install
```

#### Lancement de l'application
Puis pour lancer l'application

```bash
python launch_app.py
```
Cela : 
- Compile le frontend (vite build)
- Lance le backend FastAPI (uvicorn)

vous devez ensuite ouvri  le navigateur à `http://localhost:8000`





