/**
 * Minimal promise-based IndexedDB wrapper (browser only).
 *
 * One database with two object stores:
 *   - 'kv'    : JSON-serializable values (sessions, recent lists, settings)
 *   - 'blobs' : Blob/ArrayBuffer payloads (uploaded images, large files)
 *
 * No external dependency — works on the Vercel Hobby plan and in the Electron
 * renderer with zero backend.
 */

const DB_NAME = 'lab-tools';
const DB_VERSION = 1;
const KV_STORE = 'kv';
const BLOB_STORE = 'blobs';

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(KV_STORE)) db.createObjectStore(KV_STORE);
      if (!db.objectStoreNames.contains(BLOB_STORE)) db.createObjectStore(BLOB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(db, store, mode) {
  return db.transaction(store, mode).objectStore(store);
}

function reqToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function idbGet(key) {
  const db = await openDb();
  return reqToPromise(tx(db, KV_STORE, 'readonly').get(key));
}

export async function idbSet(key, value) {
  const db = await openDb();
  const store = tx(db, KV_STORE, 'readwrite');
  await reqToPromise(store.put(value, key));
  return key;
}

export async function idbDelete(key) {
  const db = await openDb();
  await reqToPromise(tx(db, KV_STORE, 'readwrite').delete(key));
}

export async function idbKeys() {
  const db = await openDb();
  return reqToPromise(tx(db, KV_STORE, 'readonly').getAllKeys());
}

export async function idbPutBlob(id, blob) {
  const db = await openDb();
  await reqToPromise(tx(db, BLOB_STORE, 'readwrite').put(blob, id));
  return id;
}

export async function idbGetBlob(id) {
  const db = await openDb();
  return reqToPromise(tx(db, BLOB_STORE, 'readonly').get(id));
}

export async function idbDeleteBlob(id) {
  const db = await openDb();
  await reqToPromise(tx(db, BLOB_STORE, 'readwrite').delete(id));
}

export function isIndexedDbAvailable() {
  return typeof indexedDB !== 'undefined';
}
