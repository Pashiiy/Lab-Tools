const DILUTION_REGEX = /1\s*[:\/]\s*(\d+)/;

export function parseDilutionFromSampleName(sampleName) {
  const match = sampleName.match(DILUTION_REGEX);
  if (!match) return null;

  const denominator = parseInt(match[1], 10);
  const seriesLabel = sampleName.replace(DILUTION_REGEX, '').trim() || 'Series';

  return {
    seriesLabel,
    dilutionDenominator: denominator,
    logQuantity: -Math.log10(denominator),
  };
}

export function detectStandardCurveSeries(averagedData) {
  const groups = {};

  averagedData.forEach((row) => {
    const dilution = parseDilutionFromSampleName(row.sampleName);
    if (!dilution || row.meanCq === null) return;

    const key = `${dilution.seriesLabel}||${row.targetName}`;
    if (!groups[key]) {
      groups[key] = { seriesLabel: dilution.seriesLabel, target: row.targetName, points: [] };
    }
    groups[key].points.push({
      logQuantity: dilution.logQuantity,
      meanCq: row.meanCq,
      sampleName: row.sampleName,
      dilutionDenominator: dilution.dilutionDenominator,
    });
  });

  return Object.values(groups)
    .filter((g) => g.points.length >= 2)
    .map((g) => ({
      ...g,
      points: g.points.sort((a, b) => b.logQuantity - a.logQuantity),
    }));
}
