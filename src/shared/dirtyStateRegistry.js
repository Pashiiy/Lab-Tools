const dirtyInstances = new Map();

export function setInstanceDirty(instanceId, isDirty) {
  if (isDirty) {
    dirtyInstances.set(instanceId, true);
  } else {
    dirtyInstances.delete(instanceId);
  }
}

export function hasAnyDirtyInstance() {
  return dirtyInstances.size > 0;
}

export function clearInstanceDirty(instanceId) {
  dirtyInstances.delete(instanceId);
}
