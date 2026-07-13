/**
 * Research Project format — `.benchy` files with `format: benchy-research-project`,
 * distinct from Quick Analysis workspaces (`format: benchy-project`).
 *
 * Hierarchy: Project → Experiments → Samples → Images → Analyses
 * Plus parallel Runs node for qPCR (no image required).
 *
 * Legacy: `labtools-research-project` / `.labtools` accepted on import.
 */
export const RESEARCH_FORMAT = 'benchy-research-project';
export const LEGACY_RESEARCH_FORMAT = 'labtools-research-project';
export const RESEARCH_SCHEMA_VERSION = 1;
export const RESEARCH_EXTENSION = 'benchy';
export const LEGACY_RESEARCH_EXTENSION = 'labtools';

let idCounter = 0;
export function genId(prefix = 'id') {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

function isKnownResearchFormat(format) {
  return format === RESEARCH_FORMAT || format === LEGACY_RESEARCH_FORMAT;
}

export function createEmptyResearchProject({
  name = 'Untitled Project',
  pi = '',
  researcher = '',
  description = '',
  startDate = new Date().toISOString().slice(0, 10),
  endDate = '',
  location = '',
  notes = '',
  appVersion = '0.0.0',
} = {}) {
  const now = new Date().toISOString();
  return {
    format: RESEARCH_FORMAT,
    schemaVersion: RESEARCH_SCHEMA_VERSION,
    metadata: {
      id: genId('rproj'),
      name,
      pi,
      researcher,
      description,
      startDate,
      endDate,
      location,
      notes,
      appVersion,
      createdAt: now,
      lastModifiedAt: now,
    },
    hierarchy: {
      experiments: [
        {
          id: genId('exp'),
          name: 'Experiment 1',
          notes: '',
          createdAt: now,
          samples: [],
        },
      ],
    },
    runs: [],
    library: { folders: [], unassignedImageIds: [] },
    images: {},
    settings: {},
    session: {
      savedAt: now,
      reason: 'create',
      ui: { section: 'overview', selectedPath: null },
    },
  };
}

export function isResearchProject(obj) {
  return !!obj && isKnownResearchFormat(obj.format) && typeof obj.schemaVersion === 'number';
}

export function validateResearchProject(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object') return { valid: false, errors: ['Not an object'] };
  if (!isKnownResearchFormat(obj.format)) errors.push(`Unexpected format: ${obj.format}`);
  if (!obj.metadata?.name) errors.push('Missing metadata.name');
  if (!obj.hierarchy || !Array.isArray(obj.hierarchy.experiments)) {
    errors.push('Missing hierarchy.experiments');
  }
  return { valid: errors.length === 0, errors };
}

export function touchResearchProject(project, reason = 'autosave') {
  return {
    ...project,
    format: RESEARCH_FORMAT,
    metadata: {
      ...project.metadata,
      lastModifiedAt: new Date().toISOString(),
    },
    session: {
      ...project.session,
      savedAt: new Date().toISOString(),
      reason,
    },
  };
}

export function createSample(partial = {}) {
  return {
    id: genId('sample'),
    name: partial.name || 'Sample',
    strain: partial.strain || '',
    genotype: partial.genotype || '',
    treatment: partial.treatment || '',
    media: partial.media || '',
    temperature: partial.temperature || '',
    incubationTime: partial.incubationTime || '',
    replicate: partial.replicate || '',
    operator: partial.operator || '',
    notes: partial.notes || '',
    imageIds: [],
  };
}

export function createAnalysis({ toolId, label, state = null }) {
  return {
    id: genId('analysis'),
    toolId,
    label: label || toolId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stateVersion: 1,
    state,
    status: 'draft',
  };
}

export function createRun({ toolId = 'qpcr-analyzer', label = 'qPCR Run', state = null } = {}) {
  return {
    id: genId('run'),
    toolId,
    label,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sampleId: null,
    stateVersion: 1,
    state,
    status: 'draft',
  };
}
