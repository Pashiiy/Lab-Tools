/**
 * Integer pixel ROI clipped to image bounds (Fiji rectangular ROI).
 */
export function clipRoiToImage(roi, imageWidth, imageHeight) {
  let x = Math.floor(roi.x);
  let y = Math.floor(roi.y);
  let w = Math.floor(roi.width);
  let h = Math.floor(roi.height);

  if (w <= 0 || h <= 0) return null;

  if (x < 0) {
    w += x;
    x = 0;
  }
  if (y < 0) {
    h += y;
    y = 0;
  }
  if (x + w > imageWidth) w = imageWidth - x;
  if (y + h > imageHeight) h = imageHeight - y;

  if (w <= 0 || h <= 0) return null;

  return { x, y, width: w, height: h };
}
