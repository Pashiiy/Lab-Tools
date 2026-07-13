/**
 * Electron-only client for the local colony Auto Count service.
 */

export function isAutoCountAvailable() {
  return Boolean(
    typeof window !== 'undefined' &&
      window.isElectron &&
      window.electronAPI?.colonyCounter?.countColonies
  );
}

/**
 * @param {string} dataUrlOrSrc
 * @param {object} maskSpec required { type: 'ellipse'|'polygon', ... }
 * @param {string} [filename]
 */
export async function requestAutoCount(dataUrlOrSrc, maskSpec, filename = 'plate.png') {
  if (!isAutoCountAvailable()) {
    throw new Error('Auto Count is available in the Benchy desktop app only.');
  }
  if (!maskSpec?.type) {
    throw new Error('Draw a Mask Area before running Auto Count.');
  }

  const base64 = await imageSrcToBase64(dataUrlOrSrc);
  const res = await window.electronAPI.colonyCounter.countColonies(base64, filename, maskSpec);
  if (!res?.success) {
    throw new Error(res?.error || 'Auto Count failed');
  }
  return res.result;
}

export async function requestSuggestDish(dataUrlOrSrc, filename = 'plate.png') {
  if (!isAutoCountAvailable() || !window.electronAPI?.colonyCounter?.suggestDish) {
    throw new Error('Dish detection is available in the Benchy desktop app only.');
  }
  const base64 = await imageSrcToBase64(dataUrlOrSrc);
  const res = await window.electronAPI.colonyCounter.suggestDish(base64, filename);
  if (!res?.success) {
    throw new Error(res?.error || 'Dish detection failed');
  }
  return res.result?.suggestion || null;
}

async function imageSrcToBase64(src) {
  if (!src) throw new Error('No image loaded');

  if (typeof src === 'string' && src.startsWith('data:')) {
    const comma = src.indexOf(',');
    if (comma < 0) throw new Error('Invalid image data URL');
    return src.slice(comma + 1);
  }

  const response = await fetch(src);
  const blob = await response.blob();
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function isMaskComplete(mask) {
  if (!mask?.type) return false;
  if (mask.type === 'ellipse') {
    return (
      Number.isFinite(mask.cx) &&
      Number.isFinite(mask.cy) &&
      Number.isFinite(mask.rx) &&
      Number.isFinite(mask.ry) &&
      mask.rx > 8 &&
      mask.ry > 8
    );
  }
  if (mask.type === 'polygon') {
    return Array.isArray(mask.points) && mask.points.length >= 3;
  }
  return false;
}
