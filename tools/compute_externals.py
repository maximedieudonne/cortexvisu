import os
import numpy as np
import pandas as pd
from ressources.utils import readgii as uio
import ressources.slam.io as sio
import ressources.slam.curvature as scurv
import ressources.slam.texture as stex
import tools.colormap.create_colormap as ccolor
from joblib import Parallel, delayed
from tqdm import tqdm

from tools.snapshot import snap_mesh  

# === Paramètres globaux ===
KMEAN_ROOT = "E:/research_dpfstar/results_rel3_dhcp/dpfstar"
OUTPUT_ROOT = "E:/research_cortical_analysis/externals"


def save_externals(VertexNormals, externals, subject_name, hemi):
    output_folder = os.path.join(OUTPUT_ROOT, f"hemi_{hemi}", subject_name)
    os.makedirs(output_folder, exist_ok=True)

    normals_path = os.path.join(output_folder, "vertex_normals.csv")
    pd.DataFrame(VertexNormals).to_csv(normals_path, index=False)

    externals_path = os.path.join(output_folder, f"{subject_name}_externals.gii")
    sio.write_texture(stex.TextureND(darray=externals), externals_path)

    print(f"[✓] Sauvegarde dans : {output_folder}")
    return externals_path, output_folder  # return path for screenshot

def compute_ray_intersection_for_group(mesh, vertices, normals):
    externals = []
    for vertex, normal in zip(vertices, normals):
        ray_origins = np.array([vertex])
        ray_directions = np.array([normal])
        locations, _, _ = mesh.ray.intersects_location(ray_origins=ray_origins, ray_directions=ray_directions)
        externals.append(len(locations) == 1)
    return externals


def compute_externals(mesh, mesh_path, subject_name, hemi, mask_medial_wall=None, mask_sylvian_valley=None, batch_size=500):
    kmean_path = os.path.join(KMEAN_ROOT, f"hemi_{hemi}", subject_name, "kmean.gii")
    if not os.path.exists(kmean_path):
        raise FileNotFoundError(f"Kmean introuvable : {kmean_path}")
    
    Kmean = uio.read_gii_file(kmean_path)
    mask = Kmean >= 0

    if mask_medial_wall is not None and os.path.exists(mask_medial_wall):
        mask &= uio.read_gii_file(mask_medial_wall)

    if mask_sylvian_valley is not None and os.path.exists(mask_sylvian_valley):
        mask &= uio.read_gii_file(mask_sylvian_valley)

    VertexNormals, _, _, _, _ = scurv.calcvertex_normals(mesh, mesh.face_normals)

    VertexNormals_masked = VertexNormals[mask]
    idx_vtxn = np.arange(len(mesh.vertices))[mask]

    def batch_data(arr, batch_size):
        for i in range(0, len(arr), batch_size):
            yield arr[i:i + batch_size]

    vertex_batches = list(batch_data(mesh.vertices[idx_vtxn], batch_size))
    normal_batches = list(batch_data(VertexNormals_masked, batch_size))

    results = Parallel(n_jobs=-1)(
        delayed(compute_ray_intersection_for_group)(mesh, vb, nb)
        for vb, nb in tqdm(zip(vertex_batches, normal_batches), total=len(vertex_batches), desc="Rayons externals")
    )

    externals = [item for sublist in results for item in sublist]
    external_tex = np.zeros(len(mesh.vertices))
    external_tex[idx_vtxn] = np.array(externals)

    return VertexNormals, external_tex


def main(mesh_path, mask_medial_wall=None, mask_sylvian_valley=None):
    mesh = sio.load_mesh(mesh_path)
    base_name = os.path.basename(mesh_path).replace(".gii", "")
    hemi = "left" if "_hemi-left_" in base_name else "right"
    subject_name = base_name

    VertexNormals, externals = compute_externals(
        mesh, mesh_path, subject_name, hemi,
        mask_medial_wall=mask_medial_wall,
        mask_sylvian_valley=mask_sylvian_valley
    )

    externals_path, output_folder = save_externals(VertexNormals, externals, subject_name, hemi)

    # === Screenshots ===
    screenshot_folder = os.path.join(output_folder, "screenshots")
    os.makedirs(screenshot_folder, exist_ok=True)
    value_color_dict = { 0: "floralwhite", 1: "indianred"}
    snap_mesh.capture_colored_mesh_snapshots(
        input_mesh=mesh_path,
        scalars=externals,
        output_path=screenshot_folder,
        colormap_type="custom",
        colormap=None,
        custom_dict=value_color_dict
    )


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Calculer et sauvegarder les régions gyrales externes par ray-tracing.")
    parser.add_argument("mesh_path", type=str, help="Chemin vers le fichier maillage .gii")
    parser.add_argument('--mask_medial_wall', type=str, default=None)
    parser.add_argument('--mask_sylvian_valley', type=str, default=None)

    args = parser.parse_args()
    main(args.mesh_path, args.mask_medial_wall, args.mask_sylvian_valley)
