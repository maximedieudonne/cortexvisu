import nibabel as nib
import numpy as np

def load_gii_surface(filepath):
    gii = nib.load(filepath)
    coords = gii.darrays[0].data.tolist()
    faces = gii.darrays[1].data.tolist()
    return coords, faces

def load_scalar_texture(filepath):
    return np.loadtxt(filepath).tolist()


