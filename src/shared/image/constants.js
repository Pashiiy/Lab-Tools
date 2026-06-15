/** Shared file input accept string for all lab tools. */
export const IMAGE_FILE_ACCEPT = 'image/*,.tif,.tiff';

export function isTiffFile(file) {
  if (!file) return false;
  const name = (file.name || '').toLowerCase();
  return (
    name.endsWith('.tif') ||
    name.endsWith('.tiff') ||
    file.type === 'image/tiff'
  );
}

/** Accept images even when the browser reports an empty MIME type (common for TIFF). */
export function isImageFile(file) {
  if (!file) return false;
  return (
    file.type.startsWith('image/') ||
    isTiffFile(file) ||
    /\.(jpe?g|png|gif|webp|bmp|tiff?)$/i.test(file.name || '')
  );
}

export const DEFAULT_DISPLAY_ADJUSTMENTS = Object.freeze({
  brightness: 0,
  contrast: 1,
});
