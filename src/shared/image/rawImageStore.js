import { isTiffFile } from './constants';
import { rgbToFijiGray } from './fijiGrayscale';

/**
 * @typedef {Object} RawImageStore
 * @property {Uint16Array} pixels - Analysis buffer (owned copy; do not mutate)
 * @property {number} width
 * @property {number} height
 * @property {8|16} bitDepth
 * @property {string} name
 * @property {string} [mimeType]
 */

/**
 * Create a RawImageStore with an owned pixel copy.
 * Never freeze TypedArrays — that makes indices non-configurable and breaks React state.
 */
export function createRawImageStore({ pixels, width, height, bitDepth, name, mimeType }) {
  const pixelsCopy = new Uint16Array(pixels);

  return {
    pixels: pixelsCopy,
    width,
    height,
    bitDepth: bitDepth === 16 ? 16 : 8,
    name: name || 'image',
    mimeType: mimeType || '',
  };
}

async function loadViaCanvas(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
      el.src = url;
    });

    const width = img.naturalWidth;
    const height = img.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas not available');

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, width, height);
    const rgba = ctx.getImageData(0, 0, width, height).data;

    const pixels = new Uint16Array(width * height);
    let bitDepth = 8;

    for (let i = 0; i < width * height; i++) {
      const o = i * 4;
      const r = rgba[o];
      const g = rgba[o + 1];
      const b = rgba[o + 2];
      pixels[i] = r === g && g === b ? r : rgbToFijiGray(r, g, b);
      if (pixels[i] > 255) bitDepth = 16;
    }

    return createRawImageStore({
      pixels,
      width,
      height,
      bitDepth,
      name: file.name,
      mimeType: file.type,
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function loadTiff(file) {
  const buffer = await file.arrayBuffer();
  const { decodeTiffToRaw } = await import('./tiffDecoder');
  const decoded = await decodeTiffToRaw(buffer);
  return createRawImageStore({
    ...decoded,
    name: file.name,
    mimeType: file.type || 'image/tiff',
  });
}

/**
 * Load any supported image file into a RawImageStore.
 * TIFF: binary ArrayBuffer → geotiff decode. Other formats: canvas (display path only).
 */
export async function loadRawImageFromFile(file) {
  if (!file) throw new Error('No file provided');
  if (isTiffFile(file)) {
    return loadTiff(file);
  }
  return loadViaCanvas(file);
}

/**
 * Tool-facing payload: raw store for analysis + metadata for display layer.
 */
export async function loadImageForTool(file) {
  const raw = await loadRawImageFromFile(file);
  return {
    raw,
    naturalWidth: raw.width,
    naturalHeight: raw.height,
    name: raw.name,
    bitDepth: raw.bitDepth,
  };
}

/**
 * Analysis-compatible view (gel quantification engine shape).
 * Analysis MUST use this object — never display buffers.
 */
export function toAnalysisImage(raw) {
  return {
    pixels: raw.pixels,
    width: raw.width,
    height: raw.height,
    bitDepth: raw.bitDepth,
    name: raw.name,
    raw,
  };
}
