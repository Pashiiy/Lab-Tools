import { DEFAULT_DISPLAY_ADJUSTMENTS } from '../../../shared/image/constants';
import { renderGelToCanvas } from './gelDisplayRenderer';

const THUMBNAIL_MAX_WIDTH = 200;

/**
 * Build a lightweight thumbnail AFTER successful decode.
 * Uses the existing renderGelToCanvas pipeline — display layer only.
 * @param {import('../../../shared/image/rawImageStore').RawImageStore} raw
 * @returns {string|null}
 */
export function createGelThumbnailDataUrl(raw) {
  if (!raw) return null;

  const scale = Math.min(1, THUMBNAIL_MAX_WIDTH / raw.width);
  const thumbW = Math.max(1, Math.round(raw.width * scale));
  const thumbH = Math.max(1, Math.round(raw.height * scale));

  const fullCanvas = document.createElement('canvas');
  renderGelToCanvas(raw, fullCanvas, DEFAULT_DISPLAY_ADJUSTMENTS);

  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = thumbW;
  thumbCanvas.height = thumbH;
  const ctx = thumbCanvas.getContext('2d');
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(fullCanvas, 0, 0, thumbW, thumbH);
  return thumbCanvas.toDataURL('image/jpeg', 0.82);
}

/**
 * Schedule thumbnail generation off the critical upload path.
 * @param {() => string|null} build
 */
export function scheduleThumbnailBuild(build) {
  const run = () => {
    try {
      return build();
    } catch {
      return null;
    }
  };

  if (typeof requestIdleCallback === 'function') {
    return new Promise((resolve) => {
      requestIdleCallback(() => resolve(run()), { timeout: 800 });
    });
  }

  return Promise.resolve().then(run);
}
