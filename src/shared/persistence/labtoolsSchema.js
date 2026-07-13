/**
 * Unified `.benchy` project format (Quick Analysis workspaces).
 *
 * One versioned container for every tool. Tools register serialize/deserialize
 * handlers; state is embedded under `tools[tabId].state`.
 *
 * Legacy: `.labtools` / `format: labtools-project` files are accepted on import
 * and normalized to the Benchy format on migrate/save.
 *
 * Schema (schemaVersion 1):
 *
 *   {
 *     format: 'benchy-project',
 *     schemaVersion: 1,
 *     metadata:  { id, name, appVersion, createdAt, lastModifiedAt },
 *     workspace: { tabs: [{ id, toolId, label }], activeTabId },
 *     tools:     { [tabId]: { toolId, stateVersion, state } },
 *     files:     { [fileId]: { name, type, size, toolId, blobRef|dataUrl, addedAt } },
 *     settings:  { theme, ... },
 *     session:   { savedAt, reason }
 *   }
 */

export const BENCHY_FORMAT = 'benchy-project';
export const LEGACY_LABTOOLS_FORMAT = 'labtools-project';
export const BENCHY_SCHEMA_VERSION = 1;
export const BENCHY_EXTENSION = 'benchy';
export const LEGACY_LABTOOLS_EXTENSION = 'labtools';

/** @deprecated Use BENCHY_FORMAT — kept for older imports */
export const LABTOOLS_FORMAT = BENCHY_FORMAT;
/** @deprecated Use BENCHY_SCHEMA_VERSION */
export const LABTOOLS_SCHEMA_VERSION = BENCHY_SCHEMA_VERSION;
/** @deprecated Use BENCHY_EXTENSION */
export const LABTOOLS_EXTENSION = BENCHY_EXTENSION;

export const PROJECT_OPEN_EXTENSIONS = [
  `.${BENCHY_EXTENSION}`,
  `.${LEGACY_LABTOOLS_EXTENSION}`,
  '.colonycount',
  '.json',
];

let idCounter = 0;
function genId(prefix) {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

function isKnownProjectFormat(format) {
  return format === BENCHY_FORMAT || format === LEGACY_LABTOOLS_FORMAT;
}

/** Create a new, empty project container. */
export function createEmptyProject({ name = 'Untitled Project', appVersion = '0.0.0' } = {}) {
  const now = new Date().toISOString();
  return {
    format: BENCHY_FORMAT,
    schemaVersion: BENCHY_SCHEMA_VERSION,
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

export function isBenchyProject(obj) {
  return !!obj && isKnownProjectFormat(obj.format) && typeof obj.schemaVersion === 'number';
}

/** @deprecated Use isBenchyProject */
export function isLabtoolsProject(obj) {
  return isBenchyProject(obj);
}

/** Structural validation. Returns { valid, errors }. */
export function validateProject(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object') {
    return { valid: false, errors: ['Not an object'] };
  }
  if (!isKnownProjectFormat(obj.format)) errors.push(`Unexpected format: ${obj.format}`);
  if (typeof obj.schemaVersion !== 'number') errors.push('Missing schemaVersion');
  if (!obj.metadata || typeof obj.metadata.name !== 'string') errors.push('Missing metadata.name');
  if (!obj.workspace || !Array.isArray(obj.workspace.tabs)) errors.push('Missing workspace.tabs[]');
  if (!obj.tools || typeof obj.tools !== 'object') errors.push('Missing tools{}');
  return { valid: errors.length === 0, errors };
}

/**
 * Upgrade / normalize to current Benchy schema. Pure and additive.
 */
export function migrateProject(obj) {
  if (!isBenchyProject(obj)) return obj;
  let next = obj;
  if (next.format === LEGACY_LABTOOLS_FORMAT) {
    next = { ...next, format: BENCHY_FORMAT };
  }
  if (next.schemaVersion > BENCHY_SCHEMA_VERSION) {
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
    !isBenchyProject(obj) &&
    typeof obj.version === 'number' &&
    'dots' in obj &&
    ('imageData' in obj || 'imageName' in obj)
  );
}

/**
 * Convert a legacy `.colonycount` session into a unified `.benchy` project
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
 * auto-migrates legacy `.colonycount` and `.labtools` content.
 */
export function deserializeProject(input, { appVersion = '0.0.0' } = {}) {
  const obj = typeof input === 'string' ? JSON.parse(input) : input;
  if (isLegacyColonyCounter(obj)) {
    return migrateLegacyColonyCounter(obj, { appVersion });
  }
  if (!isBenchyProject(obj)) {
    throw new Error('Unrecognized project file (not a .benchy, .labtools, or legacy colony session).');
  }
  const migrated = migrateProject(obj);
  const { valid, errors } = validateProject(migrated);
  if (!valid) {
    throw new Error(`Invalid .benchy project: ${errors.join('; ')}`);
  }
  return migrated;
}

/** Touch lastModifiedAt; returns a new object (immutable). */
export function touchProject(project, reason = 'autosave') {
  const now = new Date().toISOString();
  return {
    ...project,
    format: BENCHY_FORMAT,
    metadata: { ...project.metadata, lastModifiedAt: now },
    session: { ...project.session, savedAt: now, reason },
  };
}
