import { loadRawImageFromFile, toAnalysisImage } from '../../../shared/image/rawImageStore';

export { clipRoiToImage } from '../../../shared/image/roiUtils';

/**
 * Load image for gel quantification analysis (immutable raw pixels).
 */
export async function loadFijiImage(file) {
  const raw = await loadRawImageFromFile(file);
  return toAnalysisImage(raw);
}
