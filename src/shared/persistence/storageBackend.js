/**
 * Platform-aware storage backend.
 *
 * Exposes one async key/value + blob interface, implemented differently per
 * platform:
 *
 *   - electron : KV via electron-store over IPC (window.electronAPI.store.*);
 *                blobs via IndexedDB in the renderer (persists in userData).
 *                Falls back to the web backend if the IPC bridge is absent.
 *   - web      : IndexedDB (Vercel Hobby friendly — no backend, no auth).
 *   - memory   : in-process Map, used by tests and as a last resort.
 *
 * Interface (all async):
 *   get(key) | set(key, value) | delete(key) | keys()
 *   putBlob(id, blob) | getBlob(id) | deleteBlob(id)
 */
import {
  idbGet, idbSet, idbDelete, idbKeys,
  idbPutBlob, idbGetBlob, idbDeleteBlob,
  isIndexedDbAvailable,
} from './idb.js';

export function detectPlatform() {
  if (typeof window !== 'undefined' && window.isElectron) return 'electron';
  if (isIndexedDbAvailable()) return 'web';
  return 'memory';
}

export function createInMemoryBackend() {
  const kv = new Map();
  const blobs = new Map();
  return {
    platform: 'memory',
    async get(key) { return kv.has(key) ? kv.get(key) : null; },
    async set(key, value) { kv.set(key, value); return key; },
    async delete(key) { kv.delete(key); },
    async keys() { return [...kv.keys()]; },
    async putBlob(id, blob) { blobs.set(id, blob); return id; },
    async getBlob(id) { return blobs.has(id) ? blobs.get(id) : null; },
    async deleteBlob(id) { blobs.delete(id); },
  };
}

function createWebBackend() {
  return {
    platform: 'web',
    get: idbGet,
    set: idbSet,
    delete: idbDelete,
    keys: idbKeys,
    putBlob: idbPutBlob,
    getBlob: idbGetBlob,
    deleteBlob: idbDeleteBlob,
  };
}

function createElectronBackend() {
  const store = typeof window !== 'undefined' ? window.electronAPI?.store : null;
  // Blobs always go to IndexedDB (efficient binary, persists in userData).
  const web = createWebBackend();
  if (!store) {
    // IPC bridge not wired yet → behave exactly like the web backend.
    return { ...web, platform: 'electron-fallback' };
  }
  return {
    platform: 'electron',
    get: (key) => store.get(key),
    set: (key, value) => store.set(key, value),
    delete: (key) => store.delete(key),
    keys: () => store.keys(),
    putBlob: web.putBlob,
    getBlob: web.getBlob,
    deleteBlob: web.deleteBlob,
  };
}

let backend = null;

export function getStorageBackend() {
  if (backend) return backend;
  const platform = detectPlatform();
  if (platform === 'electron') backend = createElectronBackend();
  else if (platform === 'web') backend = createWebBackend();
  else backend = createInMemoryBackend();
  return backend;
}

/** Override the backend (used by tests). */
export function setStorageBackend(custom) {
  backend = custom;
}
