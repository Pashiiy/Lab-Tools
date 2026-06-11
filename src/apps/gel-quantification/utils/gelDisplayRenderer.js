import { DEFAULT_DISPLAY_ADJUSTMENTS } from '../../../shared/image/constants';

/**
 * Map raw intensity to 0–255 linear display space (no histogram stretch).
 */
function rawToDisplayLinear(value, bitDepth) {
  if (bitDepth === 16) {
    return (value / 65535) * 255;
  }
  return value;
}

/**
 * Gel Quant display formula (display-only, never affects analysis):
 * DisplayPixel = (RawPixel × contrast) + brightness
 */
export function applyGelDisplayAdjustment(linearValue, brightness, contrast) {
  const adjusted = linearValue * contrast + brightness;
  return Math.max(0, Math.min(255, adjusted));
}

/**
 * Render raw pixels to canvas with gel display adjustments.
 * Does NOT modify raw pixel data.
 */
export function renderGelToCanvas(raw, canvas, adjustments = DEFAULT_DISPLAY_ADJUSTMENTS) {
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
    const v = Math.round(applyGelDisplayAdjustment(linear, brightness, contrast));
    const o = i * 4;
    out[o] = v;
    out[o + 1] = v;
    out[o + 2] = v;
    out[o + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
}
