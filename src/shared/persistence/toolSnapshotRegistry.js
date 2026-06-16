/**
 * Live tool-instance snapshot registry.
 *
 * Each mounted tool tab registers a `getSnapshot()` that returns its current,
 * JSON-safe state. The workspace autosave orchestrator calls `collectToolStates()`
 * to assemble the `tools` map of a `.labtools` project on demand — without the
 * tools needing to push state up on every change.
 */

const instances = new Map();
const changeListeners = new Set();

/** Subscribe to "a tool's serializable state changed" signals. */
export function subscribeToolChange(fn) {
  changeListeners.add(fn);
  return () => changeListeners.delete(fn);
}

/** Fired by tools (via useToolSnapshot) when their snapshot-relevant state changes. */
export function notifyToolChange() {
  for (const fn of changeListeners) {
    try { fn(); } catch { /* listener errors must not break tools */ }
  }
}

/**
 * @param {string} instanceId  tab id
 * @param {string} toolId
 * @param {() => any} getSnapshot returns JSON-safe state (or undefined to skip)
 * @returns {() => void} unregister
 */
export function registerInstance(instanceId, toolId, getSnapshot) {
  instances.set(instanceId, { toolId, getSnapshot });
  return () => {
    const cur = instances.get(instanceId);
    if (cur && cur.getSnapshot === getSnapshot) instances.delete(instanceId);
  };
}

export function hasInstance(instanceId) {
  return instances.has(instanceId);
}

/** Build the `tools` map for a project: { [instanceId]: { toolId, stateVersion, state } }. */
export function collectToolStates() {
  const tools = {};
  for (const [instanceId, { toolId, getSnapshot }] of instances) {
    try {
      const state = getSnapshot();
      if (state !== undefined && state !== null) {
        tools[instanceId] = { toolId, stateVersion: 1, state };
      }
    } catch {
      // A tool that can't snapshot right now is skipped, not fatal.
    }
  }
  return tools;
}

export function _resetInstances() {
  instances.clear();
}
