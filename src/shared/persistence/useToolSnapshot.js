import { useEffect, useRef } from 'react';
import { registerInstance, notifyToolChange } from './toolSnapshotRegistry.js';

/**
 * Bridge a tool instance into the workspace autosave system.
 *
 * Usage inside a tool's top-level component:
 *
 *   useToolSnapshot(instanceId, 'gel-quantification', getSnapshot);
 *
 * `getSnapshot` should return the tool's current JSON-safe state. It is wrapped
 * in a ref so the tool can pass a fresh closure on every render without
 * re-registering. The matching restore path is the `initialState` prop the
 * shell passes to the tool (read once on mount by the tool's hook).
 */
export function useToolSnapshot(instanceId, toolId, getSnapshot) {
  const snapshotRef = useRef(getSnapshot);
  snapshotRef.current = getSnapshot;

  useEffect(() => {
    if (!instanceId || !toolId) return undefined;
    const unregister = registerInstance(instanceId, toolId, () => snapshotRef.current?.());
    return unregister;
  }, [instanceId, toolId]);

  // Signal the workspace to autosave when this tool's serializable state changes.
  // `getSnapshot` MUST be a stable (memoized) reference so this only fires on
  // real state changes — otherwise it would loop.
  useEffect(() => {
    notifyToolChange();
  }, [getSnapshot]);
}
