// colormap.js
const customFunctions = {}; // Pour stocker les colormaps personnalisées

const colormaps = {
  viridis: [[0.267,0.005,0.329],[0.283,0.141,0.458],[0.254,0.265,0.530],[0.207,0.372,0.553],[0.164,0.471,0.558],[0.128,0.567,0.551],[0.135,0.659,0.518],[0.267,0.749,0.441],[0.478,0.821,0.318],[0.741,0.873,0.150],[0.993,0.906,0.144]],
  jet: [[0,0,0.5],[0,0,1],[0,1,1],[1,1,0],[1,0,0]],
  plasma: [[0.050,0.030,0.527],[0.292,0.042,0.635],[0.496,0.135,0.615],[0.678,0.282,0.518],[0.838,0.429,0.388],[0.954,0.607,0.208],[0.994,0.789,0.003]],
  grayscale: [[0,0,0], [1,1,1]]
};

const colormapMeta = {};

export function registerColormap(name, steps, customFunc = null, type = 'continuous') {
  colormaps[name] = steps;
  if (customFunc) customFunctions[name] = customFunc;
  colormapMeta[name] = { type };
}

export function getColormapType(name) {
  if (colormapMeta[name]?.type) {
    return colormapMeta[name].type;
  }

  if (localStorage.getItem('customColormap:' + name)) {
    return 'discrete';
  }

  return 'continuous';
}

export function applyColormap(values, cmapName, customMin = null, customMax = null) {
  const cmap = colormaps[cmapName];
  if (!cmap) {
    console.warn(`Colormap "${cmapName}" non trouvée, fallback sur viridis`);
    return applyColormap(values, 'viridis', customMin, customMax);
  }


  const min = customMin !== null ? customMin : Math.min(...values);
  const max = customMax !== null ? customMax : Math.max(...values);
  const range = max - min || 1;

  if (customFunctions[cmapName]) {
  return customFunctions[cmapName](values, min, max);
}



  const colors = new Float32Array(values.length * 3);
  for (let i = 0; i < values.length; i++) {
    const t = Math.max(0, Math.min(1, (values[i] - min) / range));
    const idx = Math.floor(t * (cmap.length - 1));
    const next = Math.min(idx + 1, cmap.length - 1);
    const f = t * (cmap.length - 1) - idx;
    const [r1, g1, b1] = cmap[idx];
    const [r2, g2, b2] = cmap[next];
    colors[i * 3] = r1 + f * (r2 - r1);
    colors[i * 3 + 1] = g1 + f * (g2 - g1);
    colors[i * 3 + 2] = b1 + f * (b2 - b1);
  }
  return colors;
}

export function applyDiscreteColormap(values, ranges) {
  const colors = new Float32Array(values.length * 3);
  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    let hex = '#808080';
    for (const r of ranges) {
      if (val >= r.min && val <= r.max) {
        hex = r.color;
        break;
      }
    }
    const rgb = hexToRgb01(hex);
    colors.set([rgb.r, rgb.g, rgb.b], i * 3);
  }
  return colors;
}

export function getCustomColormap(name) {
  return customFunctions[name] || null;
}

function hexToRgb01(hex) {
  const bigint = parseInt(hex.replace(/^#/, ''), 16);
  return {
    r: ((bigint >> 16) & 255) / 255,
    g: ((bigint >> 8) & 255) / 255,
    b: (bigint & 255) / 255
  };
}
