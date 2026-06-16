/**
 * High-level project persistence API used by the shell and tool hooks.
 *
 * Wraps the platform storage backend with the `.labtools` schema and the
 * recent-files / recent-projects logic. This is the ONLY module the UI layer
 * needs to import for save / load / autosave / recovery / recents.
 *
 * Storage keys:
 *   session:current   → autosaved live workspace (crash recovery + restore)
 *   project:<id>      → explicitly saved named projects (Recent Projects reopen)
 *   recent:files      → Recent Files list
 *   recent:projects   → Recent Projects list
 *   settings:global   → app-wide settings
 */
import { getStorageBackend } from './storageBackend.js';
import {
  deserializeProject,
  migrateProject,
  touchProject,
  validateProject,
} from './labtoolsSchema.js';
import {
  addRecentFile, removeRecent, clearRecent,
  addRecentProject, renameRecentProject, removeRecentProject,
} from './recentStore.js';

const KEY_CURRENT = 'session:current';
const KEY_RECENT_FILES = 'recent:files';
const KEY_RECENT_PROJECTS = 'recent:projects';
const KEY_SETTINGS = 'settings:global';
const projectKey = (id) => `project:${id}`;

/* ------------------------------ Live session ------------------------------- */

export async function saveCurrentSession(project, reason = 'autosave') {
  const backend = getStorageBackend();
  await backend.set(KEY_CURRENT, touchProject(project, reason));
  return true;
}

export async function loadCurrentSession() {
  const backend = getStorageBackend();
  const raw = await backend.get(KEY_CURRENT);
  if (!raw) return null;
  const project = migrateProject(raw);
  const { valid } = validateProject(project);
  return valid ? project : null;
}

export async function clearCurrentSession() {
  await getStorageBackend().delete(KEY_CURRENT);
}

/* --------------------------- Named projects (CRUD) ------------------------- */

export async function saveProject(project) {
  const backend = getStorageBackend();
  const stamped = touchProject(project, 'manual');
  await backend.set(projectKey(stamped.metadata.id), stamped);
  const recents = await listRecentProjects();
  const updated = addRecentProject(recents, {
    projectId: stamped.metadata.id,
    name: stamped.metadata.name,
    lastModifiedAt: stamped.metadata.lastModifiedAt,
    toolIds: [...new Set(Object.values(stamped.tools).map((t) => t.toolId))],
    tabCount: stamped.workspace.tabs.length,
    storageKey: projectKey(stamped.metadata.id),
  });
  await backend.set(KEY_RECENT_PROJECTS, updated);
  return stamped;
}

export async function loadProject(projectId) {
  const backend = getStorageBackend();
  const raw = await backend.get(projectKey(projectId));
  if (!raw) return null;
  return migrateProject(raw);
}

export async function deleteProject(projectId) {
  const backend = getStorageBackend();
  await backend.delete(projectKey(projectId));
  const recents = await listRecentProjects();
  await backend.set(KEY_RECENT_PROJECTS, removeRecentProject(recents, projectId));
}

/* ------------------------------ Import / export ---------------------------- */

/** Parse imported `.labtools` (or legacy `.colonycount`) text into a project. */
export function importProjectFromText(text, opts = {}) {
  return deserializeProject(text, opts);
}

/* ------------------------------ Recent projects ---------------------------- */

export async function listRecentProjects() {
  return (await getStorageBackend().get(KEY_RECENT_PROJECTS)) ?? [];
}

export async function renameProject(projectId, name) {
  const backend = getStorageBackend();
  const raw = await backend.get(projectKey(projectId));
  if (raw) {
    raw.metadata.name = name;
    await backend.set(projectKey(projectId), raw);
  }
  const recents = await listRecentProjects();
  await backend.set(KEY_RECENT_PROJECTS, renameRecentProject(recents, projectId, name));
}

/* -------------------------------- Recent files ----------------------------- */

export async function listRecentFiles() {
  return (await getStorageBackend().get(KEY_RECENT_FILES)) ?? [];
}

export async function recordRecentFile(entry) {
  const backend = getStorageBackend();
  const updated = addRecentFile(await listRecentFiles(), entry);
  await backend.set(KEY_RECENT_FILES, updated);
  return updated;
}

export async function removeRecentFile(id) {
  const backend = getStorageBackend();
  const updated = removeRecent(await listRecentFiles(), id);
  await backend.set(KEY_RECENT_FILES, updated);
  return updated;
}

export async function clearRecentFiles() {
  await getStorageBackend().set(KEY_RECENT_FILES, clearRecent());
  return [];
}

/* ------------------------------- File blobs -------------------------------- */

export async function storeFileBlob(fileId, blob) {
  return getStorageBackend().putBlob(fileId, blob);
}

export async function getFileBlob(fileId) {
  return getStorageBackend().getBlob(fileId);
}

export async function deleteFileBlob(fileId) {
  return getStorageBackend().deleteBlob(fileId);
}

/* --------------------------------- Settings -------------------------------- */

export async function getGlobalSettings() {
  return (await getStorageBackend().get(KEY_SETTINGS)) ?? {};
}

export async function setGlobalSettings(settings) {
  await getStorageBackend().set(KEY_SETTINGS, settings);
  return settings;
}
