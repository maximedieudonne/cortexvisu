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

  openBtn?.addEventListener('click', () => {
    editorModal.classList.remove('hidden');
    renderRangeList();
    renderColormapPreview(scalarMin, scalarMax);
  });

  closeBtn?.addEventListener('click', () => {
    editorModal.classList.add('hidden');
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

    // enregistrer les intervalles eux-mêmes, pas interpolés
    const sorted = customRanges.slice().sort((a, b) => a.min - b.min);
    const cmapSteps = sorted.map(r => {
      const rgb = hexToRgb01(r.color);
      return {
        min: r.min,
        max: r.max,
        rgb: [rgb.r, rgb.g, rgb.b]
      };
    });

    // définir une fonction personnalisée d'application
    const applyDiscreteColormap = (values) => {
      const colors = new Float32Array(values.length * 3);
      for (let i = 0; i < values.length; i++) {
        const v = values[i];
        let rgb = [0.5, 0.5, 0.5];
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

    // convert to [r,g,b] array for registerColormap
    const visualizationSteps = [];
    const sampleCount = 100;
    const min = scalarMin;
    const max = scalarMax;
    for (let i = 0; i < sampleCount; i++) {
      const val = min + (i / (sampleCount - 1)) * (max - min);
      let rgb = [0.5, 0.5, 0.5];
      for (const step of cmapSteps) {
        if (val >= step.min && val <= step.max) {
          rgb = step.rgb;
          break;
        }
      }
      visualizationSteps.push(rgb);
    }

    registerColormap(name, visualizationSteps, applyDiscreteColormap, 'discrete');
    localStorage.setItem('customColormap:' + name, JSON.stringify(customRanges));

    // ajout UI
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
    if (!canvas) return;
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
  }

  function getColorFromCustomMap(val) {
    for (const r of customRanges) {
      if (val >= r.min && val <= r.max) return r.color;
    }
    return '#808080';
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
