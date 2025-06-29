// app/uiEvents.js
// -----------------------------------------------------------------------------
// Point central : branche tous les listeners UI
// -----------------------------------------------------------------------------

import { setupAccordion }     from './ui/setupAccordion.js';
import { bindMeshSelection }   from './ui/meshSelection.js';
import { bindTextureSelection } from './ui/textureSelection.js';
import { bindNormalSelection }  from './ui/normalSelection.js';
import { bindColormapSelection } from './ui/colormapSelection.js';
import { bindColormapRangeControls } from './ui/colormapRange.js';
import { bindWireframeToggle } from './ui/wireframeToggle.js';
import { bindEdgeToggle }      from './ui/edgeToggle.js';
import { bindImportPackage }   from './ui/importPackage.js';
import { bindNormalVisibilityToggle } from './ui/normalVisibilityToggle.js';

export function bindUIEvents() {
  setupAccordion();
  bindMeshSelection();
  bindTextureSelection();
  bindNormalSelection(); 
  bindNormalVisibilityToggle();
  bindColormapSelection();
  bindColormapRangeControls();
  bindWireframeToggle();
  bindEdgeToggle();
  bindImportPackage();
}
