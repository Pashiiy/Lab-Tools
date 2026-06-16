/**
 * Serialize / restore gel-quantification state for the unified `.labtools`
 * project format.
 *
 * Raw 16-bit pixel buffers are base64-encoded so the full image (and therefore
 * every measurement) is restored exactly on reopen. Encoded buffers are cached
 * per pixel array (WeakMap) so repeated autosaves never re-encode an unchanged
 * image.
 */
import { createRawImageStore } from '../../../shared/image/rawImageStore';

const encodeCache = new WeakMap();

function bufferToBase64(u16) {
  const bytes = new Uint8Array(u16.buffer, u16.byteOffset, u16.byteLength);
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function base64ToUint16(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Uint16Array(bytes.buffer);
}

export function serializeRaw(raw) {
  if (!raw?.pixels) return null;
  let pixelsB64 = encodeCache.get(raw.pixels);
  if (!pixelsB64) {
    pixelsB64 = bufferToBase64(raw.pixels);
    encodeCache.set(raw.pixels, pixelsB64);
  }
  return {
    width: raw.width,
    height: raw.height,
    bitDepth: raw.bitDepth,
    name: raw.name,
    mimeType: raw.mimeType,
    pixelsB64,
  };
}

export function deserializeRaw(obj) {
  if (!obj?.pixelsB64) return null;
  const pixels = base64ToUint16(obj.pixelsB64);
  const store = createRawImageStore({
    pixels,
    width: obj.width,
    height: obj.height,
    bitDepth: obj.bitDepth,
    name: obj.name,
    mimeType: obj.mimeType,
  });
  // Keep the cache warm so re-serializing the restored gel is free.
  encodeCache.set(store.pixels, obj.pixelsB64);
  return store;
}
