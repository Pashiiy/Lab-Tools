/** Strict Fiji/ImageJ compatibility flags — no smoothing or normalization. */
export const FIJI_COMPATIBILITY_MODE = true;

/**
 * ImageJ ColorProcessor.toGrayscale() weights (BT.601).
 * @see ij.process.ColorProcessor#getBrightness(int)
 */
export const FIJI_GRAY_WEIGHTS = {
  r: 0.299,
  g: 0.587,
  b: 0.114,
};

export const ROI_TYPES = {
  INNER: 'inner',
  OUTER: 'outer',
};
