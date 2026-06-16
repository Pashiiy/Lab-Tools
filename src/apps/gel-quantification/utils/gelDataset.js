import { DEFAULT_DISPLAY_ADJUSTMENTS } from '../../../shared/image/constants';
import { CREATION_MODES } from '../engine/roiModel';

let nextGelId = 1;

export function createInitialDocument() {
  return {
    pairs: [],
    rois: [],
    activeRoiId: null,
    creationMode: CREATION_MODES.TARGET,
  };
}

/**
 * @typedef {Object} GelEntry
 * @property {string} id
 * @property {string} name
 * @property {import('../../../shared/image/rawImageStore').RawImageStore} raw
 * @property {string|null} [thumbnailUrl] - cached strip thumbnail (display only)
 * @property {{ brightness: number, contrast: number }} displayAdjustments
 * @property {boolean} inverted - display-only flag
 * @property {ReturnType<typeof createInitialDocument>} doc
 */

/** @returns {GelEntry} */
export function createGelEntry(raw, overrides = {}) {
  const seq = nextGelId++;
  return {
    id: overrides.id ?? `gel-${seq}`,
    name: overrides.name ?? `Gel ${seq}`,
    raw,
    thumbnailUrl: overrides.thumbnailUrl ?? null,
    displayAdjustments: { ...DEFAULT_DISPLAY_ADJUSTMENTS },
    inverted: false,
    doc: createInitialDocument(),
  };
}

export function updateGelInList(gels, gelId, patch) {
  return gels.map((g) => (g.id === gelId ? { ...g, ...patch } : g));
}

/** Keep the id counter ahead of any restored `gel-N` ids to avoid collisions. */
export function bumpGelIdPast(ids = []) {
  for (const id of ids) {
    const match = /gel-(\d+)/.exec(id ?? '');
    if (match) nextGelId = Math.max(nextGelId, parseInt(match[1], 10) + 1);
  }
}
