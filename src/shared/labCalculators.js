/** C1V1 = C2V2 — returns stock volume and diluent volume (same units as inputs). */
export function calcDilution(c1, v2, c2) {
  if (!c1 || !v2 || !c2 || c1 <= 0 || v2 <= 0 || c2 <= 0) {
    return { stockVolume: null, diluentVolume: null, valid: false };
  }
  const stockVolume = (c2 * v2) / c1;
  if (stockVolume > v2) {
    return { stockVolume, diluentVolume: null, valid: false, error: 'Stock volume exceeds final volume' };
  }
  return {
    stockVolume,
    diluentVolume: v2 - stockVolume,
    valid: true,
  };
}

const MASTER_MIX_PER_RXN = [
  { component: 'FWD Primer', volume: 1.0 },
  { component: 'REV Primer', volume: 1.0 },
  { component: 'Water', volume: 9.5 },
  { component: 'GoTaq', volume: 12.5 },
];

const PER_RXN_TOTAL = MASTER_MIX_PER_RXN.reduce((s, c) => s + c.volume, 0);

/** PCR master mix scaled by reactions + optional overage %. */
export function calcMasterMix(reactions, overagePercent = 0) {
  const n = Math.max(0, Number(reactions) || 0);
  const overage = Math.max(0, Number(overagePercent) || 0);
  const multiplier = n * (1 + overage / 100);

  const perReaction = MASTER_MIX_PER_RXN.map((row) => ({
    ...row,
    total: row.volume * multiplier,
  }));

  const totals = perReaction.map((row) => ({
    component: row.component,
    volume: row.total,
  }));

  const totalMix = PER_RXN_TOTAL * multiplier;

  return {
    perReaction: MASTER_MIX_PER_RXN,
    totals,
    totalMix,
    reactions: n,
    overagePercent: overage,
    multiplier,
    perReactionTotal: PER_RXN_TOTAL,
  };
}
