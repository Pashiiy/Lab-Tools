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
export async function requestAutoCount(dataUrlOrSrc, maskSpec, filename = 'plate.png', { debug = false } = {}) {
  if (!isAutoCountAvailable()) {
    throw new Error('Auto Count is available in the Benchy desktop app only.');
  }
  if (!maskSpec?.type) {
    throw new Error('Draw a Mask Area before running Auto Count.');
  }

  const base64 = await imageSrcToBase64(dataUrlOrSrc);
  const res = await window.electronAPI.colonyCounter.countColonies(
    base64,
    filename,
    maskSpec,
    Boolean(debug)
  );
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

export function isGroundTruthSaveAvailable() {
  return Boolean(
    typeof window !== 'undefined' &&
      window.isElectron &&
      window.electronAPI?.colonyCounter?.saveGroundTruth
  );
}

/**
 * Save the current display image + manual count + mask as an accuracy fixture.
 * Reads state only — does not modify markers.
 */
export async function saveGroundTruthFixture({
  imageSrc,
  plateName,
  count,
  mask,
  density,
  notes,
}) {
  if (!isGroundTruthSaveAvailable()) {
    throw new Error('Saving ground truth is available in the Benchy desktop app only.');
  }
  if (!mask?.type) throw new Error('Draw a Mask Area before saving ground truth.');
  if (!Number.isFinite(Number(count)) || Number(count) < 0) {
    throw new Error('Marker count is required.');
  }

  const pngBase64 = await imageSrcToPngBase64(imageSrc);
  const res = await window.electronAPI.colonyCounter.saveGroundTruth({
    imageBase64: pngBase64,
    plateName,
    count: Math.floor(Number(count)),
    mask,
    density,
    notes,
  });
  if (!res?.success) {
    throw new Error(res?.error || 'Failed to save ground truth');
  }
  return res.result;
}

async function imageSrcToPngBase64(src) {
  if (!src) throw new Error('No image loaded');

  // Already a PNG data URL
  if (typeof src === 'string' && /^data:image\/png;base64,/i.test(src)) {
    return src.slice(src.indexOf(',') + 1);
  }

  const img = await loadHtmlImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const dataUrl = canvas.toDataURL('image/png');
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

function loadHtmlImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for ground-truth export'));
    img.src = src;
  });
}
