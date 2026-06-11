/** Shared file input accept string for all lab tools. */
export const IMAGE_FILE_ACCEPT =
  '.jpg,.jpeg,.png,.tif,.tiff,image/jpeg,image/png,image/tiff';

export function isTiffFile(file) {
  if (!file) return false;
  const name = (file.name || '').toLowerCase();
  return (
    name.endsWith('.tif') ||
    name.endsWith('.tiff') ||
    file.type === 'image/tiff'
  );
}

export const DEFAULT_DISPLAY_ADJUSTMENTS = Object.freeze({
  brightness: 0,
  contrast: 1,
});
