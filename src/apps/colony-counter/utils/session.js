/**
 * Colony Counter session format.
 *
 * v1 — single plate (flat imageData + dots + cfu)
 * v2 — batch plates[] + activePlateId + shared categories
 *
 * CFU math lives in utils/cfu.js and is unchanged; sessions only store inputs.
 */

export const AUTOSAVE_KEY = 'colonyCounter_autosave';

export function getAutosaveKey(instanceId) {
  return `${AUTOSAVE_KEY}_${instanceId}`;
}

export const SESSION_VERSION = 2;

export function formatTimeAgo(dateStr) {
  if (!dateStr) return 'recently';
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (hours < 48) return 'yesterday';
  return date.toLocaleDateString();
}

let plateCounter = 0;
export function createPlateId() {
  plateCounter += 1;
  return `plate-${Date.now().toString(36)}-${plateCounter.toString(36)}`;
}

export function defaultCfu() {
  return {
    dilutionMode: 'preset',
    dilutionExponent: -4,
    customDilution: null,
    volumeMl: 0.1,
  };
}

export function defaultPlateMeta(overrides = {}) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    sampleName: '',
    notes: '',
    date: today,
    strain: '',
    treatment: '',
    timePoint: '',
    replicate: '',
    ...overrides,
  };
}

/** Serialize CFU UI fields into the session cfu object. */
export function serializeCfu({ dilutionMode, dilutionExponent, customDilution, volumeMl }) {
  return {
    dilutionMode,
    dilutionExponent: dilutionMode === 'preset' ? -dilutionExponent : null,
    customDilution: dilutionMode === 'custom' ? customDilution || null : null,
    volumeMl,
  };
}

export function deserializeCfu(cfu = {}) {
  const useCustom =
    cfu.dilutionMode === 'custom' ||
    (cfu.customDilution != null && cfu.customDilution !== '');
  if (useCustom) {
    return {
      dilutionMode: 'custom',
      dilutionExponent: 4,
      customDilution: String(cfu.customDilution ?? ''),
      volumeMl: cfu.volumeMl ?? 0.1,
    };
  }
  return {
    dilutionMode: 'preset',
    dilutionExponent: Math.abs(cfu.dilutionExponent ?? 4),
    customDilution: '',
    volumeMl: cfu.volumeMl ?? 0.1,
  };
}

/**
 * Build a serializable plate record from live UI state.
 * `image` may be null while loading; callers should only snapshot loaded plates.
 */
export function buildPlateRecord({
  id,
  name,
  image,
  dots,
  activeCategory,
  dotRadius,
  opacity,
  dilutionMode,
  dilutionExponent,
  customDilution,
  volumeMl,
  meta = {},
  originalSrc = null,
}) {
  const sampleName =
    meta.sampleName ||
    image?.name?.replace(/\.[^/.]+$/, '') ||
    name ||
    'Plate';
  return {
    id,
    name: name || sampleName,
    imageName: image?.name || `${sampleName}.jpg`,
    imageData: image?.src ?? null,
    originalSrc: originalSrc || null,
    naturalWidth: image?.naturalWidth ?? null,
    naturalHeight: image?.naturalHeight ?? null,
    displayWidth: image?.displayWidth ?? null,
    displayHeight: image?.displayHeight ?? null,
    dots: dots || [],
    activeCategory,
    dotRadius,
    opacity,
    cfu: serializeCfu({ dilutionMode, dilutionExponent, customDilution, volumeMl }),
    ...defaultPlateMeta(meta),
    sampleName,
  };
}

/** Migrate v1 flat session → v2 plates[]. Idempotent for v2. */
export function migrateSession(session) {
  if (!session || typeof session !== 'object') return null;

  if (Array.isArray(session.plates) && session.plates.length > 0) {
    return {
      ...session,
      version: SESSION_VERSION,
      activePlateId: session.activePlateId || session.plates[0].id,
      plates: session.plates.map((p) => ({
        ...defaultPlateMeta(),
        ...p,
        id: p.id || createPlateId(),
        name: p.name || p.sampleName || p.imageName || 'Plate',
        dots: p.dots || [],
        cfu: p.cfu || defaultCfu(),
      })),
    };
  }

  // v1 / legacy flat
  if (session.imageData) {
    const plateId = 'plate-1';
    const sampleName =
      session.imageName?.replace(/\.[^/.]+$/, '') || 'colony-session';
    return {
      version: SESSION_VERSION,
      savedAt: session.savedAt || new Date().toISOString(),
      sessionName: sampleName,
      activePlateId: plateId,
      categories: session.categories || null,
      plates: [
        {
          id: plateId,
          name: session.imageName || 'Plate 1',
          imageName: session.imageName,
          imageData: session.imageData,
          originalSrc: session.originalSrc || null,
          naturalWidth: null,
          naturalHeight: null,
          displayWidth: null,
          displayHeight: null,
          dots: session.dots || [],
          activeCategory: session.activeCategory || 'cat-1',
          dotRadius: session.dotRadius || 12,
          opacity: session.opacity ?? 0.7,
          cfu: session.cfu || defaultCfu(),
          ...defaultPlateMeta({ sampleName }),
        },
      ],
    };
  }

  return null;
}

export function validateSession(session) {
  const migrated = migrateSession(session);
  if (!migrated) return false;
  return migrated.plates.some((p) => p.imageData);
}

/** @deprecated use buildBatchSessionObject — kept for callers during migration */
export function buildSessionObject(args) {
  const plate = buildPlateRecord({
    id: 'plate-1',
    name: args.image?.name || 'Plate 1',
    ...args,
    meta: { sampleName: args.sessionName || '' },
  });
  return {
    version: SESSION_VERSION,
    savedAt: new Date().toISOString(),
    sessionName: args.sessionName || plate.sampleName,
    activePlateId: plate.id,
    categories: args.categories,
    plates: [plate],
  };
}

export function buildBatchSessionObject({
  sessionName,
  activePlateId,
  categories,
  plates,
}) {
  return {
    version: SESSION_VERSION,
    savedAt: new Date().toISOString(),
    sessionName: sessionName || 'colony-session',
    activePlateId,
    categories,
    plates,
  };
}

export function syncDotIdCounter(dots) {
  let max = 0;
  (dots || []).forEach((dot) => {
    if (typeof dot.id === 'number') {
      max = Math.max(max, dot.id);
    } else if (typeof dot.id === 'string') {
      const match = dot.id.match(/(\d+)$/);
      if (match) max = Math.max(max, parseInt(match[1], 10));
    }
  });
  return max + 1;
}

/** Sync counter across every plate's dots. */
export function syncDotIdCounterAcrossPlates(plates) {
  let max = 0;
  (plates || []).forEach((p) => {
    const next = syncDotIdCounter(p.dots);
    max = Math.max(max, next - 1);
  });
  return max + 1;
}

export function triggerJsonDownload(jsonContent, filename) {
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
