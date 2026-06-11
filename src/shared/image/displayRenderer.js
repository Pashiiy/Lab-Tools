import { DEFAULT_DISPLAY_ADJUSTMENTS } from './constants';

/**
 * Map raw intensity to 0–255 display space (linear, no histogram stretch).
 */
function rawToDisplayLinear(value, bitDepth) {
  if (bitDepth === 16) {
    return (value / 65535) * 255;
  }
  return value;
}

/**
 * Apply brightness/contrast in display space only.
 * brightness: −255…255 offset
 * contrast: multiplier around midpoint 128
 */
export function applyDisplayAdjustment(displayValue, brightness, contrast) {
  const mid = 128;
  const adjusted = (displayValue - mid) * contrast + mid + brightness;
  return Math.max(0, Math.min(255, adjusted));
}

/**
 * Render RawImageStore to canvas with visual adjustments.
 * Does NOT modify raw pixels.
 */
export function renderToCanvas(raw, canvas, adjustments = DEFAULT_DISPLAY_ADJUSTMENTS) {
  const { brightness, contrast } = { ...DEFAULT_DISPLAY_ADJUSTMENTS, ...adjustments };
  const { width, height, pixels, bitDepth } = raw;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const imageData = ctx.createImageData(width, height);
  const out = imageData.data;

  for (let i = 0; i < width * height; i++) {
    const linear = rawToDisplayLinear(pixels[i], bitDepth);
    const v = Math.round(applyDisplayAdjustment(linear, brightness, contrast));
    const o = i * 4;
    out[o] = v;
    out[o + 1] = v;
    out[o + 2] = v;
    out[o + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Default display data URL (no brightness/contrast adjustment).
 */
export function createDefaultDisplayDataUrl(raw) {
  const canvas = document.createElement('canvas');
  renderToCanvas(raw, canvas, DEFAULT_DISPLAY_ADJUSTMENTS);
  return canvas.toDataURL('image/png');
}
