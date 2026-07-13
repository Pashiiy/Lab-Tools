/**
 * Persistence for Research Projects (Electron-first).
 * Keys are isolated from Quick Analysis `session:current` / `project:<id>`.
 */
import { getStorageBackend } from './storageBackend.js';
import {
  isResearchProject,
  touchResearchProject,
  validateResearchProject,
} from './researchProjectSchema.js';

const KEY_RECENT = 'recent:research-projects';
const researchKey = (id) => `research:project:${id}`;

export async function saveResearchProject(project) {
  const stamped = touchResearchProject(project, 'manual');
  const { valid, errors } = validateResearchProject(stamped);
  if (!valid) throw new Error(`Invalid research project: ${errors.join(', ')}`);
  const backend = getStorageBackend();
  await backend.set(researchKey(stamped.metadata.id), stamped);
  const recents = (await backend.get(KEY_RECENT)) ?? [];
  const entry = {
    id: stamped.metadata.id,
    projectId: stamped.metadata.id,
    name: stamped.metadata.name,
    lastModifiedAt: stamped.metadata.lastModifiedAt,
    pi: stamped.metadata.pi || '',
  };
  const next = [entry, ...recents.filter((r) => r.projectId !== entry.projectId)].slice(0, 30);
  await backend.set(KEY_RECENT, next);
  return stamped;
}

export async function autosaveResearchProject(project) {
  const stamped = touchResearchProject(project, 'autosave');
  await getStorageBackend().set(researchKey(stamped.metadata.id), stamped);
  return stamped;
}

export async function loadResearchProject(projectId) {
  const raw = await getStorageBackend().get(researchKey(projectId));
  if (!raw || !isResearchProject(raw)) return null;
  return raw;
}

export async function listRecentResearchProjects() {
  return (await getStorageBackend().get(KEY_RECENT)) ?? [];
}

export async function deleteResearchProject(projectId) {
  const backend = getStorageBackend();
  await backend.delete(researchKey(projectId));
  const recents = (await backend.get(KEY_RECENT)) ?? [];
  await backend.set(
    KEY_RECENT,
    recents.filter((r) => r.projectId !== projectId)
  );
}

export async function importResearchFromText(text) {
  const obj = typeof text === 'string' ? JSON.parse(text) : text;
  if (!isResearchProject(obj)) {
    throw new Error('Not a Benchy research project (.benchy with research format)');
  }
  const { valid, errors } = validateResearchProject(obj);
  if (!valid) throw new Error(errors.join(', '));
  return saveResearchProject(obj);
}
