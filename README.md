# cortexvisu
package for 3D cortex visualization with tree.js


Exemple d'utilisation pour vos projets perso :

from cortexvisu import show

show(
    surface_path='lh.pial.gii',
    texture_path='curvature.txt',
    title='Visualisation du cortex gauche'
)


La fonction show() :
- Charge le mesh .gii avec ta fonction load_mesh() (retourne un trimesh.Trimesh)
- Charge les scalaires avec read_gii_file() (tableau numpy/TrackedArray)
- Prépare un dictionnaire JSON pour passer à Three.js :
    - vertices: liste de [x, y, z]
    - faces: liste de [i1, i2, i3]
    - scalars: liste de float
- Sauvegarde un fichier temporaire .json
- Lance un serveur local pour ouvrir la visualisation



npm create vite@latest cortexvisu --template vanilla
cd cortexvisu
npm install
npm install three colormap


run dev_laucher.py
puis dans le bash : 

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npm run dev