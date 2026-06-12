import { clipRoiToImage } from '../../../shared/image/roiUtils';
import { measureRectROI } from './measurements';
import { buildSampleMeasurements, computeControlRatio } from './boxInBox';

export const ROI_ROLES = {
  TARGET: 'TARGET',
  CONTROL: 'CONTROL',
};

export const CREATION_MODES = {
  TARGET: 'TARGET',
  CONTROL: 'CONTROL',
};

/** Default global ROI dimensions for click-to-create (band / background boxes). */
export const DEFAULT_ROI_TEMPLATE = {
  innerWidth: 30,
  innerHeight: 70,
  outerWidth: 45,
  outerHeight: 85,
};

let nextRoiId = 1;
let nextPairId = 1;

export function createPair(overrides = {}) {
  const seq = nextPairId++;
  return {
    id: overrides.id ?? `pair-${seq}`,
    name: overrides.name ?? `Pair ${seq}`,
    targetRoiId: overrides.targetRoiId ?? null,
    controlRoiId: overrides.controlRoiId ?? null,
  };
}

/**
 * Reorder pairs by stable pair id (immutable — returns same array ref if unchanged).
 */
export function reorderPairsById(pairs, draggedId, targetId) {
  const fromIndex = pairs.findIndex((p) => p.id === draggedId);
  const toIndex = pairs.findIndex((p) => p.id === targetId);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return pairs;
  }
  const next = [...pairs];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function createRoiEntry(overrides = {}) {
  const seq = nextRoiId++;
  const id = overrides.id ?? `roi-${seq}`;
  return {
    id,
    name: overrides.name ?? `ROI ${seq}`,
    userLabel: overrides.userLabel ?? '',
    role: overrides.role ?? ROI_ROLES.TARGET,
    pairId: overrides.pairId ?? null,
    innerROI: overrides.innerROI ?? null,
    outerROI: overrides.outerROI ?? null,
  };
}

export function getIncompletePair(pairs) {
  for (let i = pairs.length - 1; i >= 0; i--) {
    if (pairs[i].targetRoiId && !pairs[i].controlRoiId) return pairs[i];
  }
  return null;
}

export function getRoiById(rois, roiId) {
  return rois.find((r) => r.id === roiId) ?? null;
}

/** Integer pixel rectangle (ImageJ-style). */
export function normalizeRect(roi) {
  if (!roi) return null;
  return {
    x: Math.floor(roi.x),
    y: Math.floor(roi.y),
    width: Math.max(1, Math.floor(roi.width)),
    height: Math.max(1, Math.floor(roi.height)),
  };
}

export function clipRectToImage(roi, imageWidth, imageHeight) {
  const normalized = normalizeRect(roi);
  if (!normalized) return null;
  return clipRoiToImage(normalized, imageWidth, imageHeight);
}

/**
 * Place concentric inner/outer ROIs centered on a click point.
 */
export function placeRoiSetAtPoint(cx, cy, template, imageWidth, imageHeight) {
  const t = template ?? DEFAULT_ROI_TEMPLATE;
  const inner = normalizeRect({
    x: cx - t.innerWidth / 2,
    y: cy - t.innerHeight / 2,
    width: t.innerWidth,
    height: t.innerHeight,
  });
  const outer = normalizeRect({
    x: cx - t.outerWidth / 2,
    y: cy - t.outerHeight / 2,
    width: t.outerWidth,
    height: t.outerHeight,
  });

  return {
    innerROI: clipRectToImage(inner, imageWidth, imageHeight),
    outerROI: clipRectToImage(outer, imageWidth, imageHeight),
  };
}

export function computeRoiMeasurements(image, roiEntry) {
  if (!image || !roiEntry) return null;

  const innerMeas = measureRectROI(image, roiEntry.innerROI);
  const outerMeas = measureRectROI(image, roiEntry.outerROI);

  if (!innerMeas.valid || !outerMeas.valid) return null;

  return buildSampleMeasurements(innerMeas, outerMeas);
}

export function enrichRoiEntry(roiEntry, image) {
  const measurements = computeRoiMeasurements(image, roiEntry);
  const displayName = roiEntry.userLabel?.trim() || roiEntry.name;
  return { ...roiEntry, displayName, measurements };
}

/**
 * Enrich pairs with target/control measurements and ratio.
 */
export function enrichPairs(pairs, rois, image) {
  const roiById = Object.fromEntries(rois.map((r) => [r.id, r]));

  return pairs.map((pair, index) => {
    const targetRaw = pair.targetRoiId ? roiById[pair.targetRoiId] : null;
    const controlRaw = pair.controlRoiId ? roiById[pair.controlRoiId] : null;
    const target = targetRaw ? enrichRoiEntry(targetRaw, image) : null;
    const control = controlRaw ? enrichRoiEntry(controlRaw, image) : null;

    const targetCorrected = target?.measurements?.correctedIntensity ?? null;
    const controlCorrected = control?.measurements?.correctedIntensity ?? null;
    const ratio = computeControlRatio(targetCorrected, controlCorrected);

    return {
      id: pair.id,
      name: pair.name,
      index: index + 1,
      targetRoiId: pair.targetRoiId,
      controlRoiId: pair.controlRoiId,
      target,
      control,
      targetCorrected,
      controlCorrected,
      ratio,
      complete: !!(target && control),
    };
  });
}

export function enrichAllRois(rois, image) {
  return rois.map((roi) => enrichRoiEntry(roi, image));
}

export function computeAveragedRatio(enrichedPairs) {
  const ratios = enrichedPairs
    .filter((p) => p.complete && p.ratio != null && Number.isFinite(p.ratio))
    .map((p) => p.ratio);
  if (ratios.length === 0) return null;
  return ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
}

export function cleanupPairsAfterRoiDelete(pairs, rois) {
  const roiIds = new Set(rois.map((r) => r.id));
  return pairs
    .map((p) => ({
      ...p,
      targetRoiId: roiIds.has(p.targetRoiId) ? p.targetRoiId : null,
      controlRoiId: roiIds.has(p.controlRoiId) ? p.controlRoiId : null,
    }))
    .filter((p) => p.targetRoiId || p.controlRoiId);
}
