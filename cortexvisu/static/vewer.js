async function loadMeshData() {
    // Le fichier JSON doit être servi localement (ex: /data/temp123.json)
    const urlParams = new URLSearchParams(window.location.search);
    const dataUrl = urlParams.get('data') || '/data.json';

    const response = await fetch(dataUrl);
    return await response.json();
}

function scalarToColor(value, min, max) {
    // Normalisation + colormap simple (bleu → rouge)
    const t = (value - min) / (max - min);
    const r = Math.max(0, Math.min(1, 2 * t));
    const b = Math.max(0, Math.min(1, 2 * (1 - t)));
    return [r, 0, b];
}

function createScene(data) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1000);
    camera.position.set(0, 0, 150);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.update();

    // Géométrie
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array(data.vertices.flat());
    const indices = new Uint32Array(data.faces.flat());

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();

    // Couleurs scalaires
    if (data.scalars) {
        const scalars = data.scalars;
        const min = Math.min(...scalars);
        const max = Math.max(...scalars);
        const colors = new Float32Array(scalars.length * 3);

        for (let i = 0; i < scalars.length; i++) {
            const [r, g, b] = scalarToColor(scalars[i], min, max);
            colors[i * 3] = r;
            colors[i * 3 + 1] = g;
            colors[i * 3 + 2] = b;
        }

        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }

    const material = new THREE.MeshStandardMaterial({
        vertexColors: data.scalars ? true : false,
        side: THREE.DoubleSide,
        flatShading: false,
        metalness: 0.1,
        roughness: 0.8
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Lumières
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Animation
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    // Titre
    document.getElementById('title').textContent = data.title || "Cortex Viewer";
}

// Initialisation
loadMeshData().then(createScene).catch(err => {
    console.error("Erreur de chargement du maillage :", err);
    document.getElementById('title').textContent = "Erreur de chargement";
});
