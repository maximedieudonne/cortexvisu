import nibabel as nb
import numpy as np
from pathlib import Path

def load_mesh(gii_path):
    g = nb.load(gii_path)
    coords = g.darrays[0].data.tolist()
    faces = g.darrays[1].data.tolist()
    return coords, faces

def load_scalar_data(scalar_path):
    g = nb.load(scalar_path)
    return g.darrays[0].data.tolist()


def write_texture(tex, gifti_file):
    darrays_list = []
    for d in tex.darray:
        gdarray = nb.gifti.GiftiDataArray(
            d.astype(np.float32), 0)
        darrays_list.append(gdarray)
    out_texture_gii = nb.gifti.GiftiImage(darrays=darrays_list)
    nb.save(out_texture_gii, gifti_file)




def load_normals_csv(path: str | Path):
    """
    Charge un CSV N×3. Ignore automatiquement une entête éventuelle.
    """
    path = Path(path)
    # détermine si la 1ʳᵉ ligne contient du texte
    first_line = path.read_text().splitlines()[0].strip()
    skip = 1 if not first_line.replace(',', '').replace('.', '').replace('-', '').isdigit() else 0

    arr = np.loadtxt(path, delimiter=',', skiprows=skip)
    if arr.ndim != 2 or arr.shape[1] != 3:
        raise ValueError('CSV doit être au format N×3 (nx,ny,nz)')
    return arr.astype(float).tolist()
