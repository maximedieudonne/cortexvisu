import { registerColormap } from './colormap.js';

let customRanges = [];

export function initColormapEditor(data, scalarMin, scalarMax, applyCallback) {
  const editorModal = document.getElementById('colormap-editor-modal');
  const openBtn = document.getElementById('open-colormap-editor');
  const closeBtn = document.getElementById('close-editor');
  const addRangeBtn = document.getElementById('add-range-btn');
  const addToListBtn = document.getElementById('add-to-list');
  const saveBtn = document.getElementById('save-colormap');
  const loadBtn = document.getElementById('load-colormap');

  const rangeMinInput = document.getElementById('range-min');
  const rangeMaxInput = document.getElementById('range-max');
  const rangeColorInput = document.getElementById('range-color');
  const nameInput = document.getElementById('colormap-name');
  const rangeList = document.getElementById('custom-ranges-list');
  const colormapSelect = document.getElementById('colormap-select');
  const backgroundColorInput = document.getElementById('background-color');

  openBtn?.addEventListener('click', () => {
    editorModal.classList.remove('hidden');
    renderRangeList();
    renderColormapPreview(scalarMin, scalarMax);
  });

  closeBtn?.addEventListener('click', () => {
    editorModal.classList.add('hidden');
  });

  backgroundColorInput?.addEventListener('input', () => {
    renderColormapPreview(scalarMin, scalarMax);
  });

  addRangeBtn?.addEventListener('click', () => {
    const min = parseFloat(rangeMinInput.value);
    const max = parseFloat(rangeMaxInput.value);
    const color = rangeColorInput.value;

    if (!isNaN(min) && !isNaN(max) && min < max) {
      customRanges.push({ min, max, color });
      renderRangeList();
      renderColormapPreview(scalarMin, scalarMax);
    }
  });

  saveBtn?.addEventListener('click', () => {
    const name = nameInput.value || 'custom';
    localStorage.setItem('customColormap:' + name, JSON.stringify(customRanges));
  });

  loadBtn?.addEventListener('click', () => {
    const name = nameInput.value || 'custom';
    const saved = localStorage.getItem('customColormap:' + name);
    if (saved) {
      customRanges = JSON.parse(saved);
      renderRangeList();
      renderColormapPreview(scalarMin, scalarMax);
    }
  });

  addToListBtn?.addEventListener('click', () => {
    const name = nameInput.value?.trim() || 'custom';
    if (!name) return;

    const bgColor = backgroundColorInput.value || '#808080';
    const sorted = customRanges.slice().sort((a, b) => a.min - b.min);

    // Créer automatiquement les plages "vides"
    const fullRanges = [];
    let current = scalarMin;
    for (const r of sorted) {
      if (r.min > current) {
        fullRanges.push({ min: current, max: r.min, color: bgColor });
      }
      fullRanges.push(r);
      current = Math.max(current, r.max);
    }
    if (current < scalarMax) {
      fullRanges.push({ min: current, max: scalarMax, color: bgColor });
    }

    // Préparation des steps interpolés pour la visualisation
    const cmapSteps = fullRanges.map(r => {
      const rgb = hexToRgb01(r.color);
      return {
        min: r.min,
        max: r.max,
        rgb: [rgb.r, rgb.g, rgb.b]
      };
    });

    const applyDiscreteColormap = (values) => {
      const fallback = hexToRgb01(bgColor);
      const colors = new Float32Array(values.length * 3);
      for (let i = 0; i < values.length; i++) {
        const v = values[i];
        let rgb = fallback;
        for (const step of cmapSteps) {
          if (v >= step.min && v <= step.max) {
            rgb = step.rgb;
            break;
          }
        }
        colors.set(rgb, i * 3);
      }
      return colors;
    };

    // Générer une version lissée pour la colorbar
    const visualizationSteps = [];
    const sampleCount = 100;
    for (let i = 0; i < sampleCount; i++) {
      const val = scalarMin + (i / (sampleCount - 1)) * (scalarMax - scalarMin);
      let rgb = hexToRgb01(bgColor);
      for (const step of cmapSteps) {
        if (val >= step.min && val <= step.max) {
          rgb = step.rgb;
          break;
        }
      }
      visualizationSteps.push(rgb);
    }

    registerColormap(name, visualizationSteps, applyDiscreteColormap, 'discrete');

    // Stocker uniquement les ranges utilisés (avec les trous remplis)
    localStorage.setItem('customColormap:' + name, JSON.stringify(fullRanges));

    if (!Array.from(colormapSelect.options).some(opt => opt.value === name)) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      colormapSelect.appendChild(opt);
    }

    colormapSelect.value = name;
    colormapSelect.dispatchEvent(new Event('change'));
    editorModal.classList.add('hidden');
  });

  function renderRangeList() {
    rangeList.innerHTML = '';
    customRanges.forEach((r, i) => {
      const container = document.createElement('div');
      container.className = 'range-entry';

      const label = document.createElement('span');
      label.textContent = `Range ${i + 1}: [${r.min} - ${r.max}]`;

      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = r.color;
      colorInput.addEventListener('input', () => {
        r.color = colorInput.value;
        renderColormapPreview(scalarMin, scalarMax);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '🗑';
      deleteBtn.addEventListener('click', () => {
        customRanges.splice(i, 1);
        renderRangeList();
        renderColormapPreview(scalarMin, scalarMax);
      });

      container.appendChild(label);
      container.appendChild(colorInput);
      container.appendChild(deleteBtn);
      rangeList.appendChild(container);
    });
  }

  function renderColormapPreview(min, max) {
    const canvas = document.getElementById('custom-colormap-preview');
    const labelContainer = document.getElementById('colormap-labels');
    if (!canvas || !labelContainer) return;

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    for (let x = 0; x < w; x++) {
      const t = x / w;
      const val = min + t * (max - min);
      const hex = getColorFromCustomMap(val);
      ctx.fillStyle = hex;
      ctx.fillRect(x, 0, 1, h);
    }

    labelContainer.innerHTML = '';

    const minLabel = document.createElement('span');
    minLabel.textContent = min.toFixed(2);
    minLabel.style.left = '0%';
    labelContainer.appendChild(minLabel);

    const maxLabel = document.createElement('span');
    maxLabel.textContent = max.toFixed(2);
    maxLabel.style.left = '100%';
    labelContainer.appendChild(maxLabel);

    for (const r of customRanges) {
      const startPct = ((r.min - min) / (max - min)) * 100;
      const endPct = ((r.max - min) / (max - min)) * 100;

      const minRLabel = document.createElement('span');
      minRLabel.textContent = r.min.toFixed(2);
      minRLabel.style.left = `${startPct}%`;
      labelContainer.appendChild(minRLabel);

      const maxRLabel = document.createElement('span');
      maxRLabel.textContent = r.max.toFixed(2);
      maxRLabel.style.left = `${endPct}%`;
      labelContainer.appendChild(maxRLabel);
    }
  }

  function getColorFromCustomMap(val) {
    for (const r of customRanges) {
      if (val >= r.min && val <= r.max) return r.color;
    }
    const bg = document.getElementById('background-color')?.value || '#808080';
    return bg;
  }
}

function hexToRgb01(hex) {
  const bigint = parseInt(hex.replace(/^#/, ''), 16);
  return {
    r: ((bigint >> 16) & 255) / 255,
    g: ((bigint >> 8) & 255) / 255,
    b: (bigint & 255) / 255
  };
}
