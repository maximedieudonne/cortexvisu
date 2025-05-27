## Etape 1  : creer un environnement isolé

```bash
conda create -n test_cortexvisu python=3.11
conda activate test_cortexvisu
```

## Etape 2 : Cloner le dépôt (dans un nouveau dossier)

```bash
git clone https://github.com/maximedieudonne/cortexvisu.git
cd cortexvisu
```

## Etape 3 : Installer les dépendances Python


```bash
pip install -r requirements.txt
```

## Etape 4 : Installer les dépendance front (vite + three.js)

```bash
npm install
```
Nécessite que node et npm soient installés.
Test rapide : node -v et npm -v.

## Etape 5 : lancer l'application
en mode dev (recommandé pour testé)

```bash
# Windows
./dev.bat

# Linux/macOS (si dispo)
bash dev.sh
```
Cela :
- Lance le backend FastAPI (avec uvicorn)
- Lance le frontend avec vite
- Ouvre automatiquement le navigateur sur http://localhost:5173

## Etape 6 : tester les fonctionnalités

- Charger un maillage .gii
- Charger une texture .gii
- Afficher et interagir avec la colormap
- Afficher l’histogramme
- Activer wireframe / edges
- Tester le bouton “courbure” (génération depuis le backend)
- Dessiner une texture personnalisée


## En cas d'erreur : 

- Vérifier la console du navigateur (F12)
- Vérifier le terminal (erreurs FastAPI ou vite)
- Tester les endpoints avec un outil comme Postman ou curl

## A la fin du test : 
Vous pouvez supprimer l'environnement avec :

``` bash
conda deactivate
conda remove -n test_cortexvisu --all
```