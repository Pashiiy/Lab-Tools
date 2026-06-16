/**
 * Parses a sample name into a timepoint and (optional) dilution.
 *
 * Recognizes three formats, checked in order:
 *   1. "{timepoint} 1:{dilution}"  e.g. "0 1:100", "24 1:10000"
 *   2. "1:{dilution}"               e.g. "1:100"  (implies timepoint = 0)
 *   3. "{timepoint}"                e.g. "0", "24", "48" (no dilution series)
 *
 * Returns { timepoint, dilutionDenominator, hasDilution } or null if unparseable.
 * dilutionDenominator is null when the sample has no dilution component (format 3).
 */
export function parseSampleName(sampleName) {
  const trimmed = sampleName.trim();

  // Format 1: timepoint + dilution, e.g. "0 1:100"
  let match = trimmed.match(/^([\d.]+)\s+1\s*[:\/]\s*(\d+)$/);
  if (match) {
    return {
      timepoint: parseFloat(match[1]),
      dilutionDenominator: parseInt(match[2], 10),
      hasDilution: true,
    };
  }

  // Format 2: dilution only, no timepoint prefix, e.g. "1:100"
  match = trimmed.match(/^1\s*[:\/]\s*(\d+)$/);
  if (match) {
    return {
      timepoint: 0,
      dilutionDenominator: parseInt(match[1], 10),
      hasDilution: true,
    };
  }

  // Format 3: plain number only, no dilution, e.g. "24"
  match = trimmed.match(/^([\d.]+)$/);
  if (match) {
    return {
      timepoint: parseFloat(match[1]),
      dilutionDenominator: null,
      hasDilution: false,
    };
  }

  return null; // unparseable — sample is excluded from the Time Course tab
}

export function buildTimeCourseData(ddCtResults) {
  if (!ddCtResults || ddCtResults.length === 0) return null;

  const data = [];

  ddCtResults.forEach((row) => {
    if (row.rq === null) return;
    const parsed = parseSampleName(row.sample);
    if (!parsed) return;

    data.push({
      timepoint: parsed.timepoint,
      dilution: parsed.dilutionDenominator,
      target: row.target,
      sampleName: row.sample,
      rq: row.rq,
      rqErrorPlus: row.rqErrorPlus ?? null,
      rqErrorMinus: row.rqErrorMinus ?? null,
    });
  });

  if (data.length === 0) return null;

  const timepoints = [...new Set(data.map((d) => d.timepoint))].sort((a, b) => a - b);

  // Only include REAL dilution values — nulls are filtered out, not turned into
  // a "null" bucket. For a dilution-free experiment this ends up empty.
  const dilutions = [...new Set(data.map((d) => d.dilution).filter((d) => d !== null))].sort(
    (a, b) => a - b
  );

  const targets = [...new Set(data.map((d) => d.target))].sort();

  // True only when every row carries a real dilution. A pure dilution-free
  // experiment (e.g. "0", "24", "48") — or an unusual mix — flips this to false,
  // and the rest of the app then hides/skips all dilution-specific UI & grouping.
  const hasDilutionData = data.every((d) => d.dilution !== null);

  return { timepoints, dilutions, targets, data, hasDilutionData };
}

// NOTE: dilution may be `null` for samples with no dilution series (e.g. "24").
// Object/Map keys coerce null consistently, so lookups keyed by [target][dilution]
// work correctly without special-casing — do not add a `dilution ?? 'default'`
// substitution here, as that would make null collide with a real value of 0.
export function normalizeToT0(data, t0Timepoint) {
  const t0Rq = {};
  data.forEach((row) => {
    if (row.timepoint !== t0Timepoint) return;
    if (!t0Rq[row.target]) t0Rq[row.target] = {};
    t0Rq[row.target][row.dilution] = row.rq;
  });

  return data.map((row) => {
    const baseline = t0Rq[row.target]?.[row.dilution];
    if (!baseline || baseline === 0) {
      return { ...row, normalizedPercent: null, foldVsT0: null, normErrPlus: null, normErrMinus: null };
    }
    const foldVsT0 = row.rq / baseline;
    const normalizedPercent = foldVsT0 * 100;

    let normErrPlus = null;
    let normErrMinus = null;
    if (row.rqErrorPlus !== null && row.rqErrorMinus !== null && row.rq) {
      normErrPlus = (row.rqErrorPlus / row.rq) * normalizedPercent;
      normErrMinus = (row.rqErrorMinus / row.rq) * normalizedPercent;
    }

    return {
      ...row,
      normalizedPercent: parseFloat(normalizedPercent.toFixed(2)),
      foldVsT0: parseFloat(foldVsT0.toFixed(4)),
      normErrPlus,
      normErrMinus,
    };
  });
}

export function computeTargetRatio(normalizedData, targetA, targetB) {
  const result = [];
  const grouped = {};

  normalizedData.forEach((row) => {
    const key = `${row.timepoint}||${row.dilution}`;
    if (!grouped[key]) grouped[key] = { timepoint: row.timepoint, dilution: row.dilution };
    if (row.target === targetA) grouped[key].rqA = row.rq;
    if (row.target === targetB) grouped[key].rqB = row.rq;
  });

  Object.values(grouped).forEach((g) => {
    if (g.rqA == null || g.rqB == null || g.rqB === 0) {
      result.push({ timepoint: g.timepoint, dilution: g.dilution, ratio: null });
    } else {
      result.push({
        timepoint: g.timepoint,
        dilution: g.dilution,
        ratio: parseFloat((g.rqA / g.rqB).toFixed(4)),
      });
    }
  });

  return result.sort((a, b) => a.timepoint - b.timepoint || a.dilution - b.dilution);
}

export function combineDilutions(normalizedData, selectedDilutions, selectedTargets, valueKey) {
  const result = [];
  const tps = [...new Set(normalizedData.map((d) => d.timepoint))].sort((a, b) => a - b);

  tps.forEach((tp) => {
    selectedTargets.forEach((target) => {
      const vals = normalizedData
        .filter(
          (d) =>
            d.timepoint === tp &&
            d.target === target &&
            selectedDilutions.includes(d.dilution) &&
            d[valueKey] !== null &&
            d[valueKey] !== undefined
        )
        .map((d) => d[valueKey]);

      if (vals.length === 0) return;
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const sd =
        vals.length > 1
          ? Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (vals.length - 1))
          : 0;
      result.push({
        timepoint: tp,
        target,
        mean,
        sd,
        bandUpper: mean + sd,
        bandLower: Math.max(0, mean - sd),
      });
    });
  });

  return result;
}

export const DILUTION_STROKES = {
  10: undefined,
  100: '4 4',
  1000: '1 3',
  10000: '6 2 1 2',
};

// Null-safe series label: a dilution-free sample (dilution === null) always
// renders as just the target name, regardless of the "show dilution labels" toggle.
export function lineLabel(target, dilution, showDilutionLabels) {
  if (dilution === null || dilution === undefined) return target;
  return showDilutionLabels ? `${target} 1:${dilution}` : target;
}
