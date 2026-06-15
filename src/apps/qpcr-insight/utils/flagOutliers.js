export function flagOutliers(replicates) {
  const groups = {};
  replicates.forEach((r) => {
    if (r.cq === null) return;
    const key = `${r.sampleName}||${r.targetName}`;
    (groups[key] = groups[key] || []).push(r);
  });

  const outlierIds = new Set();
  Object.values(groups).forEach((group) => {
    if (group.length < 2) return;
    const mean = group.reduce((s, r) => s + r.cq, 0) / group.length;
    group.forEach((r) => {
      if (Math.abs(r.cq - mean) > 0.5) outlierIds.add(r.id);
    });
  });
  return outlierIds;
}
