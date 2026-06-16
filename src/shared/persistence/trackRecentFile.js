/**
 * Record a user-opened file in Recent Files and persist its bytes in the blob
 * store so the web build can reopen it after refresh (no filesystem path).
 */
import { recordRecentFile, storeFileBlob } from './projectStore.js';

let fileCounter = 0;

function inferFileType(file) {
  if (file.type) return file.type;
  const n = (file.name || '').toLowerCase();
  if (n.endsWith('.tif') || n.endsWith('.tiff')) return 'image/tiff';
  if (n.endsWith('.csv')) return 'text/csv';
  if (n.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (n.endsWith('.xls')) return 'application/vnd.ms-excel';
  if (n.endsWith('.eds')) return 'application/octet-stream';
  if (n.endsWith('.labtools')) return 'application/json';
  return 'application/octet-stream';
}

/**
 * @param {File|Blob} file
 * @param {string} toolId  e.g. 'gel-quantification'
 * @returns {Promise<object>} the recent-file entry
 */
export async function trackRecentFile(file, toolId) {
  if (!file || !toolId) return null;
  fileCounter += 1;
  const name = file.name || 'untitled';
  const type = inferFileType(file);
  const fileId = `blob-${Date.now().toString(36)}-${fileCounter}`;
  await storeFileBlob(fileId, file);
  return recordRecentFile({
    name,
    type,
    toolId,
    fileId,
    lastOpenedAt: new Date().toISOString(),
  });
}

/** Reopen a recent file: fetch blob → File → dispatch to the target tool. */
export async function reopenRecentFileEntry(entry, { getFileBlob, openTool }) {
  if (!entry?.fileId) {
    throw new Error('This recent file has no stored copy (metadata only).');
  }
  const blob = await getFileBlob(entry.fileId);
  if (!blob) {
    throw new Error('File data is no longer available in local storage.');
  }
  const file = new File([blob], entry.name, { type: entry.type || blob.type || '' });
  if (entry.toolId && openTool) openTool(entry.toolId);
  window.dispatchEvent(
    new CustomEvent('labtools:open-file', { detail: { toolId: entry.toolId, file } })
  );
  return file;
}
