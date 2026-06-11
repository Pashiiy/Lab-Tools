import { clipRoiToImage } from '../../../shared/image/roiUtils';
import { measureRectROI } from './measurements';
import { buildSampleMeasurements, computeControlRatio } from './boxInBox';

export const ROI_ROLES = {
  TARGET: 'TARGET',
  CONTROL: 'CONTROL',
};

export const CREATION_MODES = ROI_ROLES;

/** Default global ROI dimensions for click-to-create. */
export const DEFAULT_ROI_TEMPLATE = {
  innerWidth: 40,
  innerHeight: 50,
  outerWidth: 55,
  outerHeight: 65,
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
  return {
    ...roiEntry,
    displayName,
    measurements,
  };
}

export function findOpenPair(pairs) {
  return [...pairs].reverse().find((p) => p.targetRoiId && !p.controlRoiId) ?? null;
}

/**
 * Enrich pairs with target/control ROIs, measurements, and ratio.
 */
export function enrichPairs(pairs, rois, image) {
  const roiById = Object.fromEntries(rois.map((r) => [r.id, r]));

  const enriched = pairs.map((pair, index) => {
    const targetRaw = pair.targetRoiId ? roiById[pair.targetRoiId] : null;
    const controlRaw = pair.controlRoiId ? roiById[pair.controlRoiId] : null;

    const target = targetRaw ? enrichRoiEntry(targetRaw, image) : null;
    const control = controlRaw ? enrichRoiEntry(controlRaw, image) : null;

    const ratio = computeControlRatio(
      target?.measurements?.correctedIntensity,
      control?.measurements?.correctedIntensity
    );

    return {
      ...pair,
      pairNumber: index + 1,
      target,
      control,
      ratio,
      isComplete: Boolean(target && control),
    };
  });

  const completeRatios = enriched
    .filter((p) => p.isComplete && p.ratio != null && Number.isFinite(p.ratio))
    .map((p) => p.ratio);

  const averagedRatio =
    completeRatios.length > 0
      ? completeRatios.reduce((a, b) => a + b, 0) / completeRatios.length
      : null;

  return enriched.map((p) => ({
    ...p,
    averagedRatio: p.isComplete ? averagedRatio : null,
  }));
}

export function enrichAllRoisFromPairs(pairs, rois, image) {
  return rois.map((roi) => {
    const pair = pairs.find((p) => p.id === roi.pairId);
    const enriched = enrichRoiEntry(roi, image);
    return {
      ...enriched,
      pairName: pair?.name ?? '—',
      pairNumber: pair ? pairs.indexOf(pair) + 1 : null,
    };
  });
}

export function syncPairsAfterRoiDelete(pairs, rois) {
  const roiIds = new Set(rois.map((r) => r.id));

  let nextPairs = pairs
    .map((p) => ({
      ...p,
      targetRoiId: p.targetRoiId && roiIds.has(p.targetRoiId) ? p.targetRoiId : null,
      controlRoiId: p.controlRoiId && roiIds.has(p.controlRoiId) ? p.controlRoiId : null,
    }))
    .filter((p) => p.targetRoiId || p.controlRoiId);

  return { pairs: nextPairs, rois };
}
