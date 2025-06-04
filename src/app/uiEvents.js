// app/uiEvents.js

import { setupAccordion } from './ui/setupAccordion.js';
import { bindMeshSelection } from './ui/meshSelection.js';
import { bindTextureSelection } from './ui/textureSelection.js';
import { bindColormapSelection } from './ui/colormapSelection.js';
import { bindColormapRangeControls } from './ui/colormapRange.js';
import { bindWireframeToggle } from './ui/wireframeToggle.js';
import { bindEdgeToggle } from './ui/edgeToggle.js';
import { bindImportPackage } from './ui/importPackage.js'

export function bindUIEvents() {
  setupAccordion();
  bindMeshSelection();
  bindTextureSelection();
  bindColormapSelection();
  bindColormapRangeControls();
  bindWireframeToggle();
  bindEdgeToggle();
  bindImportPackage();
}


