import JSZip from 'jszip';
import { indexToPosition } from '../constants/palette';

async function readJSON(zip, path) {
  const file = zip.file(path);
  if (!file) return null;
  const text = await file.async('string');

  // QuantStudio exports NaN for cqSD/cqSE when replicate count = 1.
  // JSON.parse rejects NaN, so normalize it.
  const sanitized = text.replace(/\bNaN\b/g, 'null');

  return JSON.parse(sanitized);
}

export async function parseEDSFile(arrayBuffer) {
  const zip = await JSZip.loadAsync(arrayBuffer);

  const [
    summary,
    plateSetup,
    runMethod,
    runSummary,
    analysisResult,
    analysisSetting,
    standardCurveResult,
  ] = await Promise.all([
    readJSON(zip, 'summary.json'),
    readJSON(zip, 'setup/plate_setup.json'),
    readJSON(zip, 'setup/run_method.json'),
    readJSON(zip, 'run/run_summary.json'),
    readJSON(zip, 'primary/analysis_result.json'),
    readJSON(zip, 'primary/analysis_setting.json'),
    readJSON(zip, 'extensions/am.sc/standard_curve_result.json'),
  ]);

  if (!plateSetup?.wells || !analysisResult?.wellResults) {
    throw new Error(
      'Invalid EDS file: missing plate setup or analysis results. Make sure this is a QuantStudio .eds export.'
    );
  }

  const wellMap = {};
  plateSetup.wells.forEach((well) => {
    wellMap[well.index] = {
      index: well.index,
      position: indexToPosition(well.index),
      sampleName: well.sampleName || '',
      targets: well.targetAssignments || [],
    };
  });

  const wellResults = {};
  analysisResult.wellResults.forEach((wr) => {
    wellResults[wr.wellIndex] = wr;
  });

  const wells = Object.values(wellMap).map((w) => {
    const result = wellResults[w.index];
    const reactions = result?.reactionResults || [];
    return {
      ...w,
      reactions: reactions.map((r) => ({
        targetName: r.targetName,
        task: r.task,
        quantity: r.quantity,
        cq: r.amplificationResult?.cq ?? null,
        cqConf: r.amplificationResult?.cqConf ?? null,
        ctThreshold: r.amplificationResult?.ctThreshold ?? null,
        baselineStart: r.amplificationResult?.ctBaselineStart ?? null,
        baselineEnd: r.amplificationResult?.ctBaselineEnd ?? null,
        ampScore: r.amplificationResult?.ampScore ?? null,
        ampStatus: r.amplificationResult?.ampStatus ?? null,
        rn: r.amplificationResult?.rn ?? [],
        deltaRn: r.amplificationResult?.deltaRn ?? [],
        meltCurve:
          r.meltResult?.meltCurve ??
          r.meltResult?.derivativeMeltCurve ??
          r.meltCurve ??
          [],
        meltDerivative: r.meltResult?.derivativeMeltCurve ?? [],
        meltPeak:
          r.meltResult?.meltPeakTemperature ??
          r.meltPeakTemperature ??
          null,
        meltTemperatures: r.meltResult?.meltTemperatures ?? [],
        meltStartTemp: r.meltResult?.meltStartTemperature ?? null,
        meltEndTemp: r.meltResult?.meltEndTemperature ?? null,
        flags: r.resultQCIssues ?? [],
        omitted: r.omitted ?? false,
      })),
    };
  });

  for (let i = 0; i < 96; i++) {
    if (!wellMap[i]) {
      wells.push({
        index: i,
        position: indexToPosition(i),
        sampleName: '',
        targets: [],
        reactions: [],
      });
    }
  }
  wells.sort((a, b) => a.index - b.index);

  const targets = [
    ...new Set(wells.flatMap((w) => w.reactions.map((r) => r.targetName))),
  ]
    .filter(Boolean)
    .sort();

  const samples = [...new Set(wells.map((w) => w.sampleName).filter(Boolean))].sort();

  const cycleCount =
    wells.find((w) => w.reactions[0]?.rn?.length)?.reactions[0]?.rn?.length ?? 40;

  return {
    sourceType: 'eds',
    summary,
    plateSetup,
    runMethod,
    runSummary,
    analysisSetting,
    standardCurveResult,
    wells,
    targets,
    samples,
    cycleCount,
    experimentName: summary?.name || 'Untitled Experiment',
  };
}
