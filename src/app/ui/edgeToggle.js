// app/ui/edgeToggle.js
import { getCurrentMesh, getScene } from '../../utils/sceneState.js';
import { setWireframe, toggleEdges } from '../../viewer/viewer.js';

export function bindEdgeToggle() {
  const edgeToggle = document.getElementById('edges-toggle');
  const edgeColor = document.getElementById('edge-color');
  const wireframeToggle = document.getElementById('wireframe');

  const updateEdges = () => {
    const currentMesh = getCurrentMesh();
    if (!currentMesh) return;

    const options = { color: edgeColor.value };
    const enabled = edgeToggle.checked;

    toggleEdges(currentMesh, getScene(), enabled, options);

    if (enabled && wireframeToggle?.checked) {
      wireframeToggle.checked = false;
      setWireframe(currentMesh, false);
    }
  };

  edgeToggle?.addEventListener('change', updateEdges);
  edgeColor?.addEventListener('input', updateEdges);
}