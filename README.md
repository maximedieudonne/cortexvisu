# CortexVisu


# Documentation complète – REST API Python pour la visualisation et l’analyse de maillages 3D du cortex

## Table des matières
1. [Introduction](#1-introduction)  
2. [Architecture générale](#2-architecture-générale)  
3. [Installation et démarrage rapide](#3-installation-et-démarrage-rapide)  
4. [Endpoints de l’API REST](#4-endpoints-de-lapi-rest)  
5. [Détails des modules et des fonctions](#5-détails-des-modules-et-des-fonctions)  
6. [Cas d’usage / tutoriels](#6-cas-dusage--tutoriels)  
7. [Tests](#7-tests)  
8. [CI / CD](#8-cicd)  
9. [Contribution](#9-contribution)  
10. [Roadmap](#10-roadmap)  
11. [Références](#11-références)  

---

## 1. Introduction

### Qu’est-ce qu’une API REST ?
Une **API REST** (Representational State Transfer) est une interface qui permet à différents systèmes informatiques de communiquer via le protocole **HTTP**, en respectant un ensemble de contraintes architecturales.

| Méthode | Usage                                   |
|---------|-----------------------------------------|
| `GET`   | Lire une ressource                      |
| `POST`  | Créer une ressource ou envoyer une action |
| `PUT`   | Mettre à jour une ressource existante   |
| `DELETE`| Supprimer une ressource                 |

Les réponses sont généralement renvoyées au format **JSON**, ce qui simplifie l’intégration côté client (navigateur, application mobile, etc.).  
Dans ce projet, l’API REST permet :

* de charger des fichiers 3D ;
* de déclencher des traitements scientifiques en Python ;
* de visualiser les résultats de manière interactive.

### 1.1 Contexte
*À compléter – description du problème résolu, motivations et cas d’utilisation principaux.*

### 1.2 Fonctionnalités principales
* Visualiser des maillages 3D du cortex directement depuis le navigateur  
* Lancer des analyses quantitatives (épaisseur corticale, régions ROI, etc.)  
* API REST conforme **OpenAPI / Swagger**  
* Extensible par plugins d’analyse  

---

## 2. Architecture générale

### 2.0 Vue d’ensemble

| Couche               | Rôle                                                                                           | Dossiers clés            | Technologies                    |
|----------------------|-------------------------------------------------------------------------------------------------|--------------------------|---------------------------------|
| **Back-end (API)**   | Expose les routes HTTP pour charger, analyser et servir maillages & métadonnées                 | `routes/`, `tools/`, `launch_app.py` | FastAPI, NumPy, SciPy, PyVista / VTK |
| **Front-end Web 3D** | Interface utilisateur (visualisation temps réel : colormap, wireframe, edges)                   | `src/app/` (sous-dossiers `ui/`, `viewer/`, `utils/`) | JavaScript (ES6), Three.js      |
| **Scripts CLI**      | Automatisation hors-ligne (conversion, analyse, base)                                           | `tools/`                 | Python                          |
| **Données**          | Maillages, textures, ressources statiques                                                       | `asset/`, `data/`, `uploads/` | OBJ, GIfTI, CSV, PNG            |

### 2.3 Arborescence du projet

```text
CORTEXVISU/
├─ asset/
├─ data/
├─ dist/
├─ node_modules/
├─ public/
├─ routes/
│  ├─ mesh.py
│  ├─ texture.py
│  ├─ normals.py
│  └─ import_package.py
├─ src/app/
│  ├─ ui/
│  ├─ viewer/
│  ├─ utils/
│  ├─ services/
│  ├─ main.js
│  └─ style.css
├─ tools/
├─ uploads/
├─ tests/
├─ launch_app.py
└─ README.md
```

---

## 3. Installation et démarrage rapide

```bash
git clone https://github.com/<user>/<repo>.git
cd <repo>
pip install -r requirements.txt
uvicorn app.main:app --reload
```

---

## 4. Endpoints de l’API REST

Un **endpoint** est une URL exposée par le serveur qui représente une action ou une ressource spécifique.

| Méthode | Route                       | Description                                                |
|---------|----------------------------|------------------------------------------------------------|
| `POST`  | `/api/load-mesh-from-path` | Charge un maillage depuis son chemin                       |
| `POST`  | `/api/upload-texture`      | Associe une texture scalaire à un maillage                 |
| `POST`  | `/api/import-package`      | Importe dynamiquement un module Python                     |
| `POST`  | `/api/run-function`        | Lance une fonction d’analyse sur le maillage courant       |

Exemple : l’endpoint `/api/load-mesh-from-path` permet de charger un fichier de maillage à partir de son chemin et de le rendre disponible côté front-end.

---

## 5. Détails des modules et des fonctions

### 5.1 Back-end Python
*À compléter selon les fichiers `routes/` et `tools/`.*

### 5.2 Front-end Web 3D (Three.js / JS modules)

#### 5.2.21  Import et association de fichiers de normales : `normalModal.js`

Ce module gère la modale d’import de fichiers `.csv` contenant des vecteurs de normales à associer à un ou plusieurs maillages existants.

| Élément DOM | ID                          | Description                                                      |
|-------------|----------------------------|------------------------------------------------------------------|
| Bouton ouvrir | `#open-normal-modal`       | Affiche la modale                                                |
| Bouton fermer | `#cancel-normal-load`      | Ferme la modale                                                  |
| Input chemin dossier | `#normal-folder-path` | Spécifie le dossier contenant les CSV                            |
| Bouton dossier | `#browse-normal-folder`   | Envoie la requête `/api/list-folder-files`                       |
| Input filtre | `#normal-folder-filter`    | Mot-clé de filtrage                                              |
| Bouton filtre | `#filter-normal-folder`    | Applique le filtre                                               |
| Liste fichiers du dossier | `#normal-folder-list` | Fichiers CSV détectés, avec cases à cocher                       |
| Bouton ajout à base | `#add-normal-to-db`    | Copie les fichiers cochés dans la base temporaire `normalDB[]`   |
| Liste DB internes | `#normal-db-list`        | Affiche les fichiers prêts à être associés                       |
| Bouton tout cocher | `#select-all-normals`   | Coche tous les fichiers visibles                                 |
| Liste maillages | `#loaded-mesh-list-normals` | Affiche les maillages disponibles à associer                     |
| Bouton supprimer | `#delete-selected-normals` | Supprime des entrées de `normalDB[]`                             |
| Bouton associer | `#load-normals-button`     | Associe les fichiers cochés aux maillages cochés                 |

**Fonctionnement :**

1. L’utilisateur ouvre la modale et charge un dossier de `.csv` de normales.  
2. Il peut filtrer, cocher certains fichiers, et les ajouter à la DB.  
3. Il coche un ou plusieurs maillages et fichiers CSV.  
4. Le bouton **Associer** ajoute les objets `{ name, path }` aux propriétés `normals[]` des maillages sélectionnés.  
5. Si un des maillages affectés est actuellement affiché, un callback met à jour dynamiquement la liste `#normal-list` dans l’UI principale.

*Utilisé par :* `modals.js` (appel `initNormalModal(meshes, updateNormalListForSelectedMesh)`)

---

## 6. Cas d’usage / tutoriels
*À compléter.*

---

## 7. Tests
*À compléter.*

---

## 8. CI / CD
*À compléter.*

---

## 9. Contribution
*À compléter.*

---

## 10. Roadmap
*À compléter.*

---

## 11. Références
*À compléter.*

---


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