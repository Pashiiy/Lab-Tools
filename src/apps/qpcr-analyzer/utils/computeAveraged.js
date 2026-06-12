export function flagOutliers(rows) {
  const groups = {};
  rows.forEach((row) => {
    if (row.ct === null) return;
    const key = `${row.sampleName}||${row.targetName}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  });

  const outlierIds = new Set();
  Object.values(groups).forEach((group) => {
    if (group.length < 2) return;
    const mean = group.reduce((s, r) => s + r.ct, 0) / group.length;
    group.forEach((row) => {
      if (Math.abs(row.ct - mean) > 0.5) outlierIds.add(row._id);
    });
  });
  return outlierIds;
}

export function applyOutlierFlags(rows) {
  const outlierIds = flagOutliers(rows);
  return rows.map((row) => ({
    ...row,
    isOutlier: outlierIds.has(row._id),
  }));
}

export function computeAveraged(rawData) {
  const groups = {};

  rawData.forEach((row) => {
    if (row.isNTC) return;
    const key = `${row.sampleName}||${row.targetName}`;
    if (!groups[key]) {
      groups[key] = {
        sampleName: row.sampleName,
        targetName: row.targetName,
        ctValues: [],
        undeterminedCount: 0,
        totalCount: 0,
      };
    }
    groups[key].totalCount++;
    if (row.ct !== null) {
      groups[key].ctValues.push(row.ct);
    } else {
      groups[key].undeterminedCount++;
    }
  });

  return Object.values(groups).map((g) => {
    const n = g.ctValues.length;
    const mean = n > 0 ? g.ctValues.reduce((a, b) => a + b, 0) / n : null;
    const sd =
      n > 1
        ? Math.sqrt(g.ctValues.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1))
        : null;
    const cv = mean && sd ? (sd / mean) * 100 : null;
    const hasOutlier =
      n >= 2 && g.ctValues.some((ct) => Math.abs(ct - mean) > 0.5);

    return {
      ...g,
      key: `${g.sampleName}||${g.targetName}`,
      n,
      meanCt: mean !== null ? parseFloat(mean.toFixed(3)) : null,
      sd: sd !== null ? parseFloat(sd.toFixed(4)) : null,
      cv: cv !== null ? parseFloat(cv.toFixed(1)) : null,
      hasOutlier,
    };
  });
}
