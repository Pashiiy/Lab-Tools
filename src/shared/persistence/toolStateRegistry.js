/**
 * Tool persistence registry.
 *
 * Each tool registers how to serialize its live state into a plain
 * JSON-safe object and how to restore it. This is the single extension point
 * that lets the unified `.labtools` container capture any tool — including
 * future ones — without changing the schema.
 *
 * A handler:
 *   {
 *     version: number,                 // tool state schema version
 *     serialize(liveState) => object,  // JSON-safe; no functions/typed arrays
 *     deserialize(state, ctx) => live, // inverse; ctx may carry file blobs
 *     migrate?(state, fromVersion) => state,
 *   }
 *
 * Tools that hold large binary data (images) should serialize a file reference
 * (fileId) and store the bytes via the storage backend's blob store, rather
 * than embedding multi-MB data URLs in the JSON.
 */

const registry = new Map();

export function registerToolPersistence(toolId, handler) {
  if (!toolId || !handler || typeof handler.serialize !== 'function') {
    throw new Error(`Invalid persistence handler for tool "${toolId}"`);
  }
  registry.set(toolId, { version: 1, migrate: (s) => s, ...handler });
}

export function getToolPersistence(toolId) {
  return registry.get(toolId) ?? null;
}

export function hasToolPersistence(toolId) {
  return registry.has(toolId);
}

export function listRegisteredTools() {
  return [...registry.keys()];
}

/** Serialize one tab's live tool state into a `tools[tabId]` entry. */
export function serializeToolState(toolId, liveState) {
  const handler = registry.get(toolId);
  if (!handler) return null;
  return {
    toolId,
    stateVersion: handler.version,
    state: handler.serialize(liveState),
  };
}

/**
 * Restore live state from a `tools[tabId]` entry, running the tool's migrate
 * step if the stored version is older.
 */
export function deserializeToolState(entry, ctx = {}) {
  if (!entry || !entry.toolId) return null;
  const handler = registry.get(entry.toolId);
  if (!handler) return null;
  let state = entry.state;
  if (typeof entry.stateVersion === 'number' && entry.stateVersion < handler.version) {
    state = handler.migrate(state, entry.stateVersion);
  }
  return handler.deserialize(state, ctx);
}

/** Test/cleanup helper. */
export function _resetRegistry() {
  registry.clear();
}
