export function computeDDCt({ averagedData, referenceGene, controlSample }) {
  if (!referenceGene || !controlSample) return null;

  const lookup = {};
  averagedData.forEach((row) => {
    if (!lookup[row.sampleName]) lookup[row.sampleName] = {};
    lookup[row.sampleName][row.targetName] = {
      meanCt: row.meanCt,
      sd: row.sd ?? 0,
      n: row.n,
    };
  });

  const samples = [...new Set(averagedData.map((r) => r.sampleName))];
  const targets = [...new Set(averagedData.map((r) => r.targetName))].filter(
    (t) => t !== referenceGene
  );

  const results = [];

  samples.forEach((sample) => {
    const refData = lookup[sample]?.[referenceGene];
    if (!refData || refData.meanCt === null) {
      targets.forEach((target) => {
        results.push({
          sample,
          target,
          deltaCt: null,
          ddCt: null,
          foldChange: null,
          errorPlus: null,
          errorMinus: null,
          warning: 'Missing reference gene CT for this sample',
        });
      });
      return;
    }

    targets.forEach((target) => {
      const targetData = lookup[sample]?.[target];
      if (!targetData || targetData.meanCt === null) {
        results.push({
          sample,
          target,
          deltaCt: null,
          ddCt: null,
          foldChange: null,
          errorPlus: null,
          errorMinus: null,
          warning: 'Missing CT for this sample/target combination',
        });
        return;
      }

      const deltaCt = targetData.meanCt - refData.meanCt;

      const se_dCt = Math.sqrt(
        (targetData.sd ** 2) / targetData.n + (refData.sd ** 2) / refData.n
      );

      const ctrlTargetData = lookup[controlSample]?.[target];
      const ctrlRefDataObj = lookup[controlSample]?.[referenceGene];

      let ddCt = null;
      let foldChange = null;
      let errorPlus = null;
      let errorMinus = null;

      if (
        ctrlTargetData?.meanCt !== null &&
        ctrlRefDataObj?.meanCt !== null &&
        sample !== controlSample
      ) {
        const ctrl_dCt = ctrlTargetData.meanCt - ctrlRefDataObj.meanCt;
        const se_ctrl_dCt = Math.sqrt(
          ((ctrlTargetData.sd ?? 0) ** 2) / (ctrlTargetData.n || 1) +
            ((ctrlRefDataObj.sd ?? 0) ** 2) / (ctrlRefDataObj.n || 1)
        );

        ddCt = deltaCt - ctrl_dCt;
        foldChange = 2 ** -ddCt;

        const se_ddCt = Math.sqrt(se_dCt ** 2 + se_ctrl_dCt ** 2);
        const fc_upper = 2 ** -(ddCt - se_ddCt);
        const fc_lower = 2 ** -(ddCt + se_ddCt);
        errorPlus = fc_upper - foldChange;
        errorMinus = foldChange - fc_lower;
      } else if (sample === controlSample) {
        ddCt = 0;
        foldChange = 1;
        errorPlus = 0;
        errorMinus = 0;
      }

      results.push({
        sample,
        target,
        deltaCt: deltaCt !== null ? parseFloat(deltaCt.toFixed(4)) : null,
        ddCt: ddCt !== null ? parseFloat(ddCt.toFixed(4)) : null,
        foldChange: foldChange !== null ? parseFloat(foldChange.toFixed(4)) : null,
        errorPlus: errorPlus !== null ? parseFloat(errorPlus.toFixed(4)) : null,
        errorMinus: errorMinus !== null ? parseFloat(errorMinus.toFixed(4)) : null,
        noSd: targetData.sd === null || refData.sd === null,
        warning: null,
      });
    });
  });

  return results;
}
