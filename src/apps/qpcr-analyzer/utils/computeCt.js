export function computeCt(deltaRn, threshold) {
  if (!deltaRn || deltaRn.length === 0 || threshold == null) return null;
  for (let i = 1; i < deltaRn.length; i++) {
    if (deltaRn[i - 1] < threshold && deltaRn[i] >= threshold) {
      const fraction =
        (threshold - deltaRn[i - 1]) / (deltaRn[i] - deltaRn[i - 1]);
      return i + fraction;
    }
  }
  return null;
}

export function computeAllCts(wells, targetName, threshold) {
  const result = {};
  wells.forEach((well) => {
    const reaction = well.reactions.find((r) => r.targetName === targetName);
    if (!reaction) {
      result[well.index] = null;
      return;
    }
    if (reaction.deltaRn?.length) {
      result[well.index] = computeCt(reaction.deltaRn, threshold);
    } else {
      result[well.index] = reaction.cq ?? null;
    }
  });
  return result;
}

export function recomputeDeltaRn(rn, baselineStart, baselineEnd) {
  if (!rn || rn.length === 0) return [];
  const slice = rn.slice(baselineStart - 1, baselineEnd);
  const baseline = slice.reduce((a, b) => a + b, 0) / slice.length;
  return rn.map((v) => v - baseline);
}

export function getDisplayValues(reaction, displayMode) {
  if (!reaction) return [];
  if (displayMode === 'Rn') return reaction.rn ?? [];
  const deltaRn = reaction.deltaRn ?? [];
  if (displayMode === 'Log ΔRn') {
    return deltaRn.map((v) => Math.log10(Math.max(v, 0.001)));
  }
  return deltaRn;
}
