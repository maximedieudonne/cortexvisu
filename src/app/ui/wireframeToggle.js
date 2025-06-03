// app/ui/wireframeToggle.js
import { getCurrentMesh } from '../../utils/sceneState.js';
import { setWireframe, toggleEdges } from '../../viewer/viewer.js';

export function bindWireframeToggle() {
  const wireframeToggle = document.getElementById('wireframe');
  const edgeToggle = document.getElementById('edges-toggle');

  wireframeToggle?.addEventListener('change', () => {
    const currentMesh = getCurrentMesh();
    if (!currentMesh) return;

    const enabled = wireframeToggle.checked;
    setWireframe(currentMesh, enabled);

    if (enabled && edgeToggle?.checked) {
      edgeToggle.checked = false;
      toggleEdges(currentMesh, null, false);
    }
  });
}

