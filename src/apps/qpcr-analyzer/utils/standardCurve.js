export function parseDilution(sampleName) {
  const match = String(sampleName).match(/1[:\s](\d+)/);
  return match ? 1 / parseInt(match[1], 10) : null;
}

export function linearRegression(points) {
  if (points.length < 2) return null;
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const yMean = sumY / n;
  const ssTot = points.reduce((s, p) => s + (p.y - yMean) ** 2, 0);
  const ssRes = points.reduce(
    (s, p) => s + (p.y - (slope * p.x + intercept)) ** 2,
    0
  );
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  const efficiency = (Math.pow(10, -1 / slope) - 1) * 100;
  return { slope, intercept, r2, efficiency };
}

export function buildStandardCurveData(standardCurveResult, wells, liveCtLookup) {
  if (!standardCurveResult) return null;

  const points = [];
  const wellRows = [];

  const scWells =
    standardCurveResult.wells ||
    standardCurveResult.standardWells ||
    standardCurveResult.wellResults ||
    [];

  if (scWells.length) {
    scWells.forEach((sw) => {
      const wellIndex = sw.wellIndex ?? sw.index;
      const well = wells.find((w) => w.index === wellIndex);
      const sampleName = sw.sampleName || well?.sampleName || '';
      const dilution = sw.dilution ?? parseDilution(sampleName);
      const ct =
        sw.cq ??
        sw.ct ??
        liveCtLookup?.[`${wellIndex}-${sw.targetName}`] ??
        null;
      if (dilution && ct != null) {
        const logDil = Math.log10(dilution);
        points.push({ x: logDil, y: ct, wellIndex, sampleName });
        wellRows.push({
          position: well?.position ?? `Well ${wellIndex}`,
          dilution: sampleName,
          ct,
        });
      }
    });
  } else {
    wells.forEach((well) => {
      const dilution = parseDilution(well.sampleName);
      if (!dilution) return;
      well.reactions.forEach((r) => {
        const ct = r.cq ?? liveCtLookup?.[`${well.index}-${r.targetName}`];
        if (ct != null) {
          const logDil = Math.log10(dilution);
          points.push({
            x: logDil,
            y: ct,
            wellIndex: well.index,
            sampleName: well.sampleName,
            targetName: r.targetName,
          });
          wellRows.push({
            position: well.position,
            dilution: well.sampleName,
            ct,
            targetName: r.targetName,
          });
        }
      });
    });
  }

  if (points.length < 2) return null;

  const regression = linearRegression(points);
  const targetName =
    standardCurveResult.targetName ||
    points[0]?.targetName ||
    'Standard';

  return { points, wellRows, regression, targetName };
}
