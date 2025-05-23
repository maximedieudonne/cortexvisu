import json
import webbrowser
import tempfile
import os
from .parser import load_gii_surface, load_scalar_texture
from .webserver import launch_server

def show(surface_path, texture_path=None, title="Cortex Viewer"):
    coords, faces = load_gii_surface(surface_path)
    scalars = load_scalar_texture(texture_path) if texture_path else None

    # Créer un fichier temporaire JSON pour transférer les données au JS
    data = {
        'vertices': coords,
        'faces': faces,
        'scalars': scalars,
        'title': title
    }
    tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.json')
    json.dump(data, open(tmp_file.name, 'w'))

    # Lancer le serveur Web local
    launch_server(tmp_file.name)
