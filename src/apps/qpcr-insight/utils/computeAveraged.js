export function computeAveraged(replicates) {
  const groups = {};

  replicates.forEach((r) => {
    if (r.isNTC) return;
    const key = `${r.sampleName}||${r.targetName}`;
    if (!groups[key]) {
      groups[key] = {
        sampleName: r.sampleName,
        targetName: r.targetName,
        cqValues: [],
        undeterminedCount: 0,
      };
    }
    if (r.cq !== null) groups[key].cqValues.push(r.cq);
    else groups[key].undeterminedCount++;
  });

  return Object.values(groups).map((g) => {
    const n = g.cqValues.length;
    const mean = n > 0 ? g.cqValues.reduce((a, b) => a + b, 0) / n : null;
    const sd =
      n > 1
        ? Math.sqrt(g.cqValues.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1))
        : null;
    const cv = mean && sd ? (sd / mean) * 100 : null;

    return {
      sampleName: g.sampleName,
      targetName: g.targetName,
      n,
      meanCq: mean !== null ? parseFloat(mean.toFixed(4)) : null,
      sd: sd !== null ? parseFloat(sd.toFixed(4)) : null,
      cv: cv !== null ? parseFloat(cv.toFixed(1)) : null,
      undeterminedCount: g.undeterminedCount,
      cqValues: g.cqValues,
    };
  });
}
