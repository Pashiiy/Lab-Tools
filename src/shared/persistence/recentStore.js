/**
 * Pure logic for Recent Files and Recent Projects lists.
 *
 * These functions are storage-agnostic (no IndexedDB/localStorage here) so they
 * are trivially testable. The storage layer persists the returned arrays.
 */

export const DEFAULT_RECENT_FILES_LIMIT = 40;
export const DEFAULT_RECENT_PROJECTS_LIMIT = 30;

function nowIso() {
  return new Date().toISOString();
}

/**
 * Recent file entry: { id, name, type, toolId, lastOpenedAt, fileId? }
 * Dedupe key is name + type + toolId so re-opening updates the timestamp
 * and moves the entry to the top instead of duplicating it.
 */
export function addRecentFile(list, entry, limit = DEFAULT_RECENT_FILES_LIMIT) {
  const safeList = Array.isArray(list) ? list : [];
  const id = entry.id ?? `${entry.toolId}:${entry.type}:${entry.name}`;
  const next = {
    id,
    name: entry.name,
    type: entry.type ?? '',
    toolId: entry.toolId ?? null,
    fileId: entry.fileId ?? null,
    lastOpenedAt: entry.lastOpenedAt ?? nowIso(),
  };
  const deduped = safeList.filter((e) => e.id !== id);
  return [next, ...deduped].slice(0, limit);
}

export function removeRecent(list, id) {
  return (Array.isArray(list) ? list : []).filter((e) => e.id !== id);
}

export function clearRecent() {
  return [];
}

/**
 * Recent project entry:
 *   { id, name, projectId, lastModifiedAt, toolIds: [], tabCount, storageKey }
 * Dedupe by projectId so saving the same project repeatedly updates in place.
 */
export function addRecentProject(list, entry, limit = DEFAULT_RECENT_PROJECTS_LIMIT) {
  const safeList = Array.isArray(list) ? list : [];
  const projectId = entry.projectId;
  if (!projectId) throw new Error('Recent project requires projectId');
  const next = {
    id: projectId,
    projectId,
    name: entry.name ?? 'Untitled Project',
    lastModifiedAt: entry.lastModifiedAt ?? nowIso(),
    toolIds: entry.toolIds ?? [],
    tabCount: entry.tabCount ?? 0,
    storageKey: entry.storageKey ?? null,
  };
  const deduped = safeList.filter((e) => e.projectId !== projectId);
  return [next, ...deduped]
    .sort((a, b) => new Date(b.lastModifiedAt) - new Date(a.lastModifiedAt))
    .slice(0, limit);
}

export function renameRecentProject(list, projectId, name) {
  return (Array.isArray(list) ? list : []).map((e) =>
    e.projectId === projectId ? { ...e, name } : e
  );
}

export function removeRecentProject(list, projectId) {
  return (Array.isArray(list) ? list : []).filter((e) => e.projectId !== projectId);
}
