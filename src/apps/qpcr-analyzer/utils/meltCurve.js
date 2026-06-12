export function getMeltDisplayValues(reaction) {
  const curve = reaction.meltCurve ?? reaction.meltDerivative ?? [];
  if (!curve.length) return { values: [], temperatures: [] };

  const temps =
    reaction.meltTemperatures?.length === curve.length
      ? reaction.meltTemperatures
      : generateMeltTemperatures(curve.length, reaction.meltStartTemp, reaction.meltEndTemp);

  return { values: curve, temperatures: temps };
}

function generateMeltTemperatures(n, start = 60, end = 95) {
  if (n <= 1) return [start];
  return Array.from({ length: n }, (_, i) => start + (i / (n - 1)) * (end - start));
}

export function hasMeltData(experiment) {
  if (!experiment?.wells) return false;
  return experiment.wells.some((w) =>
    w.reactions.some((r) => (r.meltCurve?.length ?? 0) > 0)
  );
}

export function buildMeltChartData(series, meltPointCount) {
  const n = meltPointCount || Math.max(
    ...series.map((s) => s.reaction.meltCurve?.length ?? 0),
    0
  );
  if (n === 0) return [];

  return Array.from({ length: n }, (_, i) => {
    const entry = { point: i };
    series.forEach((s) => {
      const { values, temperatures } = getMeltDisplayValues(s.reaction);
      entry[`temp_${s.key}`] = temperatures[i] ?? null;
      entry[`val_${s.key}`] = values[i] ?? null;
    });
    return entry;
  });
}
