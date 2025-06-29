import { setNormalsVisible } from '../../viewer/utilsNormals.js';

export function bindNormalVisibilityToggle(){
  const toggle = document.getElementById('normals-toggle');
  if (!toggle) return;
  toggle.addEventListener('change', () => {
    setNormalsVisible(toggle.checked);
  });
}
