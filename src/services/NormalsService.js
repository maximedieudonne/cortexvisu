// src/services/NormalsService.js
// ------------------------------------------------------------
// Service réseau pour récupérer un CSV de normales depuis le
// backend FastAPI, sans dépendre d'Axios. Utilise seulement
// `fetch` natif (compatible Vite / navigateurs modernes).
// ------------------------------------------------------------

/**
 * Télécharge les normales pour un mesh depuis le backend.
 * @param {string} path - Chemin absolu/relatif du fichier CSV côté serveur.
 * @param {string} [baseURL="http://localhost:8000"] - Base de l'API.
 * @returns {Promise<Float32Array>} Tableau plat [nx, ny, nz, nx2, ny2, nz2, ...]
 */
export async function fetchNormals(path, baseURL = "http://localhost:8000") {
  // 1. Appel REST --------------------------------------------------
  const res = await fetch(`${baseURL}/api/load-normals-paths`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paths: [path] })
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  // 2. Parsing JSON ------------------------------------------------
  const payload = await res.json();
  const entry = payload?.[0] ?? {};

  if (entry.error) throw new Error(entry.error);
  if (!Array.isArray(entry.normals)) throw new Error("Aucune donnée de normales");

  // 3. Conversion vers Float32Array -------------------------------
  // entry.normals = [[nx,ny,nz], ...]
  const flat = entry.normals.flat();
  return new Float32Array(flat);
}
