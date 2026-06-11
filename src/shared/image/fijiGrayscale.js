/** ImageJ ColorProcessor brightness weights (BT.601). */
export const FIJI_GRAY_WEIGHTS = Object.freeze({
  r: 0.299,
  g: 0.587,
  b: 0.114,
});

export function rgbToFijiGray(r, g, b) {
  return Math.round(
    r * FIJI_GRAY_WEIGHTS.r +
      g * FIJI_GRAY_WEIGHTS.g +
      b * FIJI_GRAY_WEIGHTS.b +
      0.5
  );
}
