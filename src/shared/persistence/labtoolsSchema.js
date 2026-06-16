/**
 * Unified `.labtools` project format.
 *
 * One versioned container for every tool in the app. Tools never define their
 * own file format — they register serialize/deserialize handlers (see
 * toolStateRegistry.js) and their state is embedded under `tools[tabId].state`.
 *
 * Schema (schemaVersion 1):
 *
 *   {
 *     format: 'labtools-project',
 *     schemaVersion: 1,
 *     metadata:  { id, name, appVersion, createdAt, lastModifiedAt },
 *     workspace: { tabs: [{ id, toolId, label }], activeTabId },
 *     tools:     { [tabId]: { toolId, stateVersion, state } },
 *     files:     { [fileId]: { name, type, size, toolId, blobRef|dataUrl, addedAt } },
 *     settings:  { theme, ... },              // project-relevant UI settings
 *     session:   { savedAt, reason }          // restoration metadata
 *   }
 *
 * `measurements` and `analysisResults` are NOT top-level: each tool owns them
 * inside its serialized `state`, which keeps the container tool-agnostic and
 * lets new tools add data without a schema redesign.
 */

export const LABTOOLS_FORMAT = 'labtools-project';
export const LABTOOLS_SCHEMA_VERSION = 1;
export const LABTOOLS_EXTENSION = 'labtools';

let idCounter = 0;
function genId(prefix) {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

/** Create a new, empty project container. */
export function createEmptyProject({ name = 'Untitled Project', appVersion = '0.0.0' } = {}) {
  const now = new Date().toISOString();
  return {
    format: LABTOOLS_FORMAT,
    schemaVersion: LABTOOLS_SCHEMA_VERSION,
    metadata: {
      id: genId('proj'),
      name,
      appVersion,
      createdAt: now,
      lastModifiedAt: now,
    },
    workspace: { tabs: [], activeTabId: null },
    tools: {},
    files: {},
    settings: {},
    session: { savedAt: now, reason: 'manual' },
  };
}

export function isLabtoolsProject(obj) {
  return !!obj && obj.format === LABTOOLS_FORMAT && typeof obj.schemaVersion === 'number';
}

/** Structural validation. Returns { valid, errors }. */
export function validateProject(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object') {
    return { valid: false, errors: ['Not an object'] };
  }
  if (obj.format !== LABTOOLS_FORMAT) errors.push(`Unexpected format: ${obj.format}`);
  if (typeof obj.schemaVersion !== 'number') errors.push('Missing schemaVersion');
  if (!obj.metadata || typeof obj.metadata.name !== 'string') errors.push('Missing metadata.name');
  if (!obj.workspace || !Array.isArray(obj.workspace.tabs)) errors.push('Missing workspace.tabs[]');
  if (!obj.tools || typeof obj.tools !== 'object') errors.push('Missing tools{}');
  return { valid: errors.length === 0, errors };
}

/**
 * Upgrade an older-schema project to the current version. Pure and additive —
 * never drops unknown fields, so forward-written data survives round-trips.
 */
export function migrateProject(obj) {
  if (!isLabtoolsProject(obj)) return obj;
  let next = obj;
  // Future migrations: if (next.schemaVersion < 2) next = upgradeV1toV2(next); ...
  if (next.schemaVersion > LABTOOLS_SCHEMA_VERSION) {
    // Newer file opened by older app: keep data, clamp version note.
    next = { ...next, _openedWithNewerSchema: next.schemaVersion };
  }
  return next;
}

/* ----------------------------- Legacy migration ---------------------------- */

/** Detect the old Colony Counter `.colonycount` JSON (version + imageData + dots). */
export function isLegacyColonyCounter(obj) {
  return (
    !!obj &&
    typeof obj === 'object' &&
    !isLabtoolsProject(obj) &&
    typeof obj.version === 'number' &&
    'dots' in obj &&
    ('imageData' in obj || 'imageName' in obj)
  );
}

/**
 * Convert a legacy `.colonycount` session into a unified `.labtools` project
 * containing a single colony-counter tab. Preserves all recoverable fields.
 */
export function migrateLegacyColonyCounter(legacy, { appVersion = '0.0.0' } = {}) {
  const project = createEmptyProject({
    name: (legacy.imageName || 'Colony Session').replace(/\.[^/.]+$/, ''),
    appVersion,
  });
  const tabId = genId('tab');
  project.workspace.tabs = [{ id: tabId, toolId: 'colony-counter', label: 'Colony Counter (1)' }];
  project.workspace.activeTabId = tabId;
  project.tools[tabId] = {
    toolId: 'colony-counter',
    stateVersion: legacy.version ?? 1,
    // The colony tool's deserialize handler understands this shape directly.
    state: legacy,
    migratedFrom: 'colonycount',
  };
  if (legacy.savedAt) {
    project.metadata.createdAt = legacy.savedAt;
    project.metadata.lastModifiedAt = legacy.savedAt;
  }
  return project;
}

/* ------------------------------- (De)serialize ------------------------------ */

export function serializeProject(project) {
  return JSON.stringify(project);
}

/**
 * Parse a string/object into a validated, migrated project. Also accepts and
 * auto-migrates legacy `.colonycount` content. Throws on unrecoverable input.
 */
export function deserializeProject(input, { appVersion = '0.0.0' } = {}) {
  const obj = typeof input === 'string' ? JSON.parse(input) : input;
  if (isLegacyColonyCounter(obj)) {
    return migrateLegacyColonyCounter(obj, { appVersion });
  }
  if (!isLabtoolsProject(obj)) {
    throw new Error('Unrecognized project file (not a .labtools or legacy colony session).');
  }
  const migrated = migrateProject(obj);
  const { valid, errors } = validateProject(migrated);
  if (!valid) {
    throw new Error(`Invalid .labtools project: ${errors.join('; ')}`);
  }
  return migrated;
}

/** Touch lastModifiedAt; returns a new object (immutable). */
export function touchProject(project, reason = 'autosave') {
  const now = new Date().toISOString();
  return {
    ...project,
    metadata: { ...project.metadata, lastModifiedAt: now },
    session: { ...project.session, savedAt: now, reason },
  };
}
