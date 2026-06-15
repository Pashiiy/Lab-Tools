export function computeDDCt({ averagedData, referenceGene, calibratorSample }) {
  if (!referenceGene) return null;

  const lookup = {};
  averagedData.forEach((row) => {
    if (!lookup[row.sampleName]) lookup[row.sampleName] = {};
    lookup[row.sampleName][row.targetName] = {
      meanCq: row.meanCq,
      sd: row.sd ?? 0,
      n: row.n || 1,
    };
  });

  const samples = [...new Set(averagedData.map((r) => r.sampleName))];
  const targets = [...new Set(averagedData.map((r) => r.targetName))].filter(
    (t) => t !== referenceGene
  );

  const hasCalibrator = !!calibratorSample;

  const deltaCt = {};
  samples.forEach((sample) => {
    const ref = lookup[sample]?.[referenceGene];
    deltaCt[sample] = {};

    targets.forEach((target) => {
      const tgt = lookup[sample]?.[target];

      if (!ref || ref.meanCq === null) {
        deltaCt[sample][target] = {
          value: null,
          se: null,
          warning: `Missing ${referenceGene} (reference gene) for sample "${sample}"`,
        };
        return;
      }
      if (!tgt || tgt.meanCq === null) {
        deltaCt[sample][target] = {
          value: null,
          se: null,
          warning: `Missing ${target} for sample "${sample}"`,
        };
        return;
      }

      const value = tgt.meanCq - ref.meanCq;
      const se = Math.sqrt((tgt.sd ** 2) / tgt.n + (ref.sd ** 2) / ref.n);
      deltaCt[sample][target] = { value, se, warning: null };
    });
  });

  const results = [];
  samples.forEach((sample) => {
    targets.forEach((target) => {
      const dCt = deltaCt[sample][target];

      const base = {
        sample,
        target,
        deltaCt: dCt.value !== null ? parseFloat(dCt.value.toFixed(4)) : null,
        rq: dCt.value !== null ? parseFloat((2 ** -dCt.value).toFixed(4)) : null,
        ddCt: null,
        foldChange: null,
        errorPlus: null,
        errorMinus: null,
        rqErrorPlus: null,
        rqErrorMinus: null,
        isCalibrator: hasCalibrator && sample === calibratorSample,
        warning:
          dCt.warning ||
          (dCt.se === null
            ? null
            : dCt.se === 0 && dCt.value !== null
              ? 'No SD available — error bars omitted'
              : null),
      };

      if (dCt.value !== null && dCt.se) {
        const rqUpper = 2 ** -(dCt.value - dCt.se);
        const rqLower = 2 ** -(dCt.value + dCt.se);
        base.rqErrorPlus = parseFloat((rqUpper - base.rq).toFixed(4));
        base.rqErrorMinus = parseFloat((base.rq - rqLower).toFixed(4));
      }

      if (!hasCalibrator || dCt.value === null) {
        results.push(base);
        return;
      }

      const dCtCal = deltaCt[calibratorSample]?.[target];
      if (!dCtCal || dCtCal.value === null) {
        results.push({
          ...base,
          warning: `Calibrator sample "${calibratorSample}" is missing ${target} — fold change unavailable`,
        });
        return;
      }

      const ddCt = dCt.value - dCtCal.value;
      const foldChange = 2 ** -ddCt;

      let errorPlus = null;
      let errorMinus = null;
      if (dCt.se !== null && dCtCal.se !== null && (dCt.se || dCtCal.se)) {
        const seDDCt = Math.sqrt(dCt.se ** 2 + dCtCal.se ** 2);
        const fcUpper = 2 ** -(ddCt - seDDCt);
        const fcLower = 2 ** -(ddCt + seDDCt);
        errorPlus = parseFloat((fcUpper - foldChange).toFixed(4));
        errorMinus = parseFloat((foldChange - fcLower).toFixed(4));
      }

      results.push({
        ...base,
        ddCt: parseFloat(ddCt.toFixed(4)),
        foldChange: parseFloat(foldChange.toFixed(4)),
        errorPlus,
        errorMinus,
      });
    });
  });

  return results;
}
