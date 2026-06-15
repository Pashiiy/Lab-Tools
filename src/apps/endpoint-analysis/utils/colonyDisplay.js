const TARGET_SCORE_KEYS = ['galcen', 'cen3', 'rearrangement', 'reciprocal'];

/** Treats 0, null, undefined, empty string, and NaN as missing (overview display only). */
export function isMissingTargetScore(value) {
  if (value === null || value === undefined) return true;
  if (value === '') return true;
  if (typeof value === 'number' && Number.isNaN(value)) return true;
  return !value;
}

export function isFailedPCR(colony) {
  return TARGET_SCORE_KEYS.every((key) => isMissingTargetScore(colony[key]));
}

/**
 * Overview-page repair product label. Does not affect classification, charts, or exports.
 */
export function getOverviewRepairProductLabel(colony, classification) {
  if (isFailedPCR(colony)) {
    return { text: 'Failed PCR', variant: 'failed-pcr' };
  }

  if (classification.repairProduct === 'UNCLASSIFIED') {
    return { text: 'Unassigned', variant: 'unassigned' };
  }

  return { text: classification.repairProduct, variant: 'normal' };
}
