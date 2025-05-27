import nibabel as nb
import numpy as np

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