/** ImageJ ColorProcessor brightness weights (BT.601). */
export const FIJI_GRAY_WEIGHTS = Object.freeze({
  r: 0.299,
  g: 0.587,
  b: 0.114,
});

/**
 * RGB -> 8-bit gray, matching ImageJ ColorProcessor: value = (int)(weighted + 0.5).
 * In JS that is Math.round(weighted) (round half up). Do NOT add an extra +0.5 —
 * Math.round already adds 0.5 and floors, so `Math.round(x + 0.5)` biases every
 * pixel up by ~0.5 and inflates IntDen.
 */
export function rgbToFijiGray(r, g, b) {
  return Math.round(
    r * FIJI_GRAY_WEIGHTS.r + g * FIJI_GRAY_WEIGHTS.g + b * FIJI_GRAY_WEIGHTS.b
  );
}
