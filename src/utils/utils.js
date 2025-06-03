// utils.js
export function hexToRgb01(hex) {
  const bigint = parseInt(hex.replace(/^#/, ''), 16);
  return {
    r: ((bigint >> 16) & 255) / 255,
    g: ((bigint >> 8) & 255) / 255,
    b: (bigint & 255) / 255
  };
}


export function showStatus(message, isError = false) {
  const el = document.getElementById('draw-status-message');
  el.textContent = message;
  el.style.background = isError ? "rgba(200,0,0,0.8)" : "rgba(0,0,0,0.7)";
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 3000);
}
