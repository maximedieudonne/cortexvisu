import { registerColormap } from './colormap.js';

let customRanges = [];
let isEditorInitialized = false;
let currentScalarMin = null;
let currentScalarMax = null;

export function initColormapEditor(data, scalarMin, scalarMax, applyCallback) {
  currentScalarMin = scalarMin;
  currentScalarMax = scalarMax;

  const editorModal = document.getElementById('colormap-editor-modal');
  const rangeMinInput = document.getElementById('range-min');
  const rangeMaxInput = document.getElementById('range-max');
  const rangeColorInput = document.getElementById('range-color');
  const nameInput = document.getElementById('colormap-name');
  const rangeList = document.getElementById('custom-ranges-list');
  const colormapSelect = document.getElementById('colormap-select');
  const backgroundColorInput = document.getElementById('background-color');
  const labelContainer = document.getElementById('colormap-labels');

  if (!isEditorInitialized) {
    isEditorInitialized = true;

    const openBtn = document.getElementById('open-colormap-editor');
    const closeBtn = document.getElementById('close-editor');
    const addRangeBtn = document.getElementById('add-range-btn');
    const addToListBtn = document.getElementById('add-to-list');
    const saveBtn = document.getElementById('save-colormap');
    const loadBtn = document.getElementById('load-colormap');

    openBtn?.addEventListener('click', () => {
      customRanges = [];
      rangeMinInput.value = '';
      rangeMaxInput.value = '';
      rangeColorInput.value = '#ff00ff';
      nameInput.value = '';
      backgroundColorInput.value = '#808080';
      rangeList.innerHTML = '';
      labelContainer.innerHTML = '';
      editorModal.classList.remove('hidden');

      renderRangeList();
      renderColormapPreview();
    });

    closeBtn?.addEventListener('click', () => {
      editorModal.classList.add('hidden');
    });

    backgroundColorInput?.addEventListener('input', () => {
      renderColormapPreview();
    });

    addRangeBtn?.addEventListener('click', () => {
      const min = parseFloat(rangeMinInput.value);
      const max = parseFloat(rangeMaxInput.value);
      const color = rangeColorInput.value;

      if (!isNaN(min) && !isNaN(max) && min < max) {
        customRanges.push({ min, max, color });
        renderRangeList();
        renderColormapPreview();
      }
    });

    saveBtn?.addEventListener('click', () => {
      const fileName = (nameInput.value || 'colormap') + '.json';
      const blob = new Blob([JSON.stringify(customRanges, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });

    loadBtn?.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';

      input.addEventListener('change', () => {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const json = JSON.parse(e.target.result);
            if (Array.isArray(json)) {
              customRanges = json;
              renderRangeList();
              renderColormapPreview();
            } else {
              alert('Le fichier ne contient pas un tableau valide de ranges.');
            }
          } catch (err) {
            alert('Erreur de lecture JSON : ' + err.message);
          }
        };
        reader.readAsText(file);
      });

      input.click();
    });

    addToListBtn?.addEventListener('click', () => {
      const name = nameInput.value?.trim() || 'custom';
      if (!name) return;

      const bgColor = backgroundColorInput.value || '#808080';
      const sorted = customRanges.slice().sort((a, b) => a.min - b.min);

      const fullRanges = [];
      let current = currentScalarMin;
      for (const r of sorted) {
        if (r.min > current) {
          fullRanges.push({ min: current, max: r.min, color: bgColor });
        }
        fullRanges.push(r);
        current = Math.max(current, r.max);
      }
      if (current < currentScalarMax) {
        fullRanges.push({ min: current, max: currentScalarMax, color: bgColor });
      }

      const cmapSteps = fullRanges.map(r => {
        const rgb = hexToRgb01(r.color);
        return { min: r.min, max: r.max, rgb: [rgb.r, rgb.g, rgb.b] };
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

      const visualizationSteps = [];
      const sampleCount = 100;
      for (let i = 0; i < sampleCount; i++) {
        const val = currentScalarMin + (i / (sampleCount - 1)) * (currentScalarMax - currentScalarMin);
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
  }
}

function renderRangeList() {
  const rangeList = document.getElementById('custom-ranges-list');
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
      renderColormapPreview();
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑';
    deleteBtn.addEventListener('click', () => {
      customRanges.splice(i, 1);
      renderRangeList();
      renderColormapPreview();
    });

    container.appendChild(label);
    container.appendChild(colorInput);
    container.appendChild(deleteBtn);
    rangeList.appendChild(container);
  });
}

function renderColormapPreview() {
  const canvas = document.getElementById('custom-colormap-preview');
  const labelContainer = document.getElementById('colormap-labels');
  if (!canvas || !labelContainer) return;

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  for (let x = 0; x < w; x++) {
    const t = x / w;
    const val = currentScalarMin + t * (currentScalarMax - currentScalarMin);
    const hex = getColorFromCustomMap(val);
    ctx.fillStyle = hex;
    ctx.fillRect(x, 0, 1, h);
  }

  labelContainer.innerHTML = '';

  const minLabel = document.createElement('span');
  minLabel.textContent = currentScalarMin.toFixed(2);
  minLabel.style.left = '0%';
  labelContainer.appendChild(minLabel);

  const maxLabel = document.createElement('span');
  maxLabel.textContent = currentScalarMax.toFixed(2);
  maxLabel.style.left = '100%';
  labelContainer.appendChild(maxLabel);

  for (const r of customRanges) {
    const startPct = ((r.min - currentScalarMin) / (currentScalarMax - currentScalarMin)) * 100;
    const endPct = ((r.max - currentScalarMin) / (currentScalarMax - currentScalarMin)) * 100;

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

function hexToRgb01(hex) {
  const bigint = parseInt(hex.replace(/^#/, ''), 16);
  return {
    r: ((bigint >> 16) & 255) / 255,
    g: ((bigint >> 8) & 255) / 255,
    b: (bigint & 255) / 255
  };
}
