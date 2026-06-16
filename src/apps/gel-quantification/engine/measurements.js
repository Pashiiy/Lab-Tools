import { clipRoiToImage } from '../../../shared/image/roiUtils.js';

/**
 * Fiji-equivalent rectangular ROI measurement on raw pixel array.
 * Area = pixel count, Mean = average intensity, IntDen = sum of intensities.
 *
 * @param {import('./fijiImage').FijiImage} image
 * @param {{ x: number, y: number, width: number, height: number } | null} roi
 */
export function measureRectROI(image, roi) {
  if (!image || !roi) {
    return {
      area: 0,
      mean: 0,
      intDen: 0,
      min: 0,
      max: 0,
      valid: false,
    };
  }

  const clipped = clipRoiToImage(roi, image.width, image.height);
  if (!clipped) {
    return {
      area: 0,
      mean: 0,
      intDen: 0,
      min: 0,
      max: 0,
      valid: false,
    };
  }

  const { x, y, width, height } = clipped;
  const { pixels, width: imgW } = image;

  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  const area = width * height;

  for (let row = y; row < y + height; row++) {
    const rowOffset = row * imgW;
    for (let col = x; col < x + width; col++) {
      const value = pixels[rowOffset + col];
      sum += value;
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }

  const mean = area > 0 ? sum / area : 0;
  const intDen = sum;

  return {
    area,
    mean,
    intDen,
    min: area > 0 ? min : 0,
    max: area > 0 ? max : 0,
    valid: true,
    roi: clipped,
  };
}

/**
 * Verify IntDen = Area × Mean (Fiji identity).
 */
export function verifyIntDenIdentity(measurement, tolerance = 1e-6) {
  if (!measurement.valid || measurement.area === 0) return true;
  const expected = measurement.area * measurement.mean;
  return Math.abs(measurement.intDen - expected) < tolerance;
}
