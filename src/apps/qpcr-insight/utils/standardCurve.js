export function linearRegression(points) {
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.logQuantity, 0);
  const sumY = points.reduce((s, p) => s + p.meanCq, 0);
  const sumXY = points.reduce((s, p) => s + p.logQuantity * p.meanCq, 0);
  const sumX2 = points.reduce((s, p) => s + p.logQuantity ** 2, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX ** 2);
  const intercept = (sumY - slope * sumX) / n;

  const yMean = sumY / n;
  const ssTot = points.reduce((s, p) => s + (p.meanCq - yMean) ** 2, 0);
  const ssRes = points.reduce((s, p) => {
    const predicted = slope * p.logQuantity + intercept;
    return s + (p.meanCq - predicted) ** 2;
  }, 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, r2 };
}

export function efficiencyFromSlope(slope) {
  if (!slope || slope === 0) return null;
  const efficiency = 10 ** (-1 / slope) - 1;
  return efficiency * 100;
}

export function efficiencyQuality(efficiency, r2) {
  if (efficiency === null) return 'Unknown';
  if (efficiency >= 90 && efficiency <= 110 && r2 >= 0.99) return 'Good';
  if (efficiency >= 80 && efficiency <= 120 && r2 >= 0.98) return 'Acceptable';
  return 'Poor';
}

export function computeStandardCurves(series) {
  return series.map((s) => {
    const { slope, intercept, r2 } = linearRegression(s.points);
    const efficiency = efficiencyFromSlope(slope);
    return {
      seriesLabel: s.seriesLabel,
      target: s.target,
      points: s.points,
      slope: parseFloat(slope.toFixed(4)),
      intercept: parseFloat(intercept.toFixed(4)),
      r2: parseFloat(r2.toFixed(4)),
      efficiency: efficiency !== null ? parseFloat(efficiency.toFixed(1)) : null,
      quality: efficiencyQuality(efficiency, r2),
    };
  });
}

export function buildRegressionLine(points, slope, intercept) {
  const xs = points.map((p) => p.logQuantity);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const pad = (maxX - minX) * 0.05 || 0.1;
  return [
    { logQuantity: minX - pad, meanCq: slope * (minX - pad) + intercept },
    { logQuantity: maxX + pad, meanCq: slope * (maxX + pad) + intercept },
  ];
}

export function prepareCurveGroups(series, { selectedSeries, combineSeries }) {
  let groups = series;

  if (selectedSeries !== 'all') {
    groups = groups.filter((g) => g.seriesLabel === selectedSeries);
  }

  if (combineSeries) {
    const byTarget = {};
    const source = selectedSeries === 'all' ? series : groups;
    source.forEach((g) => {
      if (!byTarget[g.target]) {
        byTarget[g.target] = { seriesLabel: 'combined', target: g.target, points: [] };
      }
      byTarget[g.target].points.push(...g.points);
    });
    groups = Object.values(byTarget).filter((g) => g.points.length >= 2);
  }

  return computeStandardCurves(groups);
}
