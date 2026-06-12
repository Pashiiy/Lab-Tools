import { LruCache } from '../../../shared/image/lruCache';

/** Cached canvas ImageData keyed by gel + display adjustments. */
const displayCache = new LruCache(16);

/** Thumbnail data URLs keyed by gel id. */
const thumbnailCache = new LruCache(24);

export function displayCacheKey(gelId, adjustments) {
  const b = adjustments?.brightness ?? 0;
  const c = adjustments?.contrast ?? 1;
  return `${gelId}:${b}:${c}`;
}

/**
 * @returns {{ width: number, height: number, imageData: ImageData }|undefined}
 */
export function getCachedDisplay(key) {
  return displayCache.get(key);
}

export function setCachedDisplay(key, width, height, imageData) {
  const copy = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
  displayCache.set(key, { width, height, imageData: copy });
}

export function invalidateGelDisplayCache(gelId) {
  displayCache.deleteByPrefix(`${gelId}:`);
}

export function getCachedThumbnail(gelId) {
  return thumbnailCache.get(gelId);
}

export function setCachedThumbnail(gelId, dataUrl) {
  if (dataUrl) thumbnailCache.set(gelId, dataUrl);
}

export function invalidateGelThumbnail(gelId) {
  thumbnailCache.delete(gelId);
  invalidateGelDisplayCache(gelId);
}
