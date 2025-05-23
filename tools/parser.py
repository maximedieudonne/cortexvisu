import nibabel as nb

def load_mesh(gii_path):
    g = nb.load(gii_path)
    coords = g.darrays[0].data.tolist()
    faces = g.darrays[1].data.tolist()
    return coords, faces

def load_scalar_data(scalar_path):
    g = nb.load(scalar_path)
    return g.darrays[0].data.tolist()