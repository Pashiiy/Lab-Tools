import JSZip from 'jszip';

function indexToPosition(i) {
  const row = String.fromCharCode(65 + Math.floor(i / 12));
  const col = (i % 12) + 1;
  return `${row}${col}`;
}

function findZipEntry(zip, suffix) {
  const target = suffix.toLowerCase().replace(/^\//, '');
  const match = Object.keys(zip.files).find((path) => {
    const normalized = path.toLowerCase().replace(/^\//, '');
    return normalized === target || normalized.endsWith(`/${target}`);
  });
  return match ? zip.file(match) : null;
}

async function readJSON(zip, pathSuffix) {
  const file = findZipEntry(zip, pathSuffix);
  if (!file) return null;
  const text = await file.async('string');
  const sanitized = text.replace(/\bNaN\b/g, 'null').replace(/\bInfinity\b/g, 'null');
  return JSON.parse(sanitized);
}

function normalizeTargetAssignments(assignments) {
  if (!Array.isArray(assignments)) return [];
  return assignments
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry === 'object') {
        return entry.targetName || entry.name || entry.detectorName || entry.assayName || '';
      }
      return '';
    })
    .filter(Boolean);
}

function buildPlateSetup(plateSetupRaw, analysisResult) {
  const wellMap = new Map();

  (plateSetupRaw?.wells || []).forEach((w) => {
    if (w.index == null) return;
    wellMap.set(w.index, {
      index: w.index,
      position: indexToPosition(w.index),
      sampleName: w.sampleName || w.sample || '',
      targets: normalizeTargetAssignments(
        w.targetAssignments || w.targets || w.assignedTargets || w.reactions
      ),
    });
  });

  (analysisResult?.wellResults || []).forEach((wr) => {
    if (wr.wellIndex == null) return;
    const reactionTargets = (wr.reactionResults || [])
      .map((r) => r.targetName)
      .filter(Boolean);
    const existing = wellMap.get(wr.wellIndex);

    if (existing) {
      if (!existing.sampleName && wr.sampleName) existing.sampleName = wr.sampleName;
      existing.targets = [...new Set([...existing.targets, ...reactionTargets])];
    } else {
      wellMap.set(wr.wellIndex, {
        index: wr.wellIndex,
        position: indexToPosition(wr.wellIndex),
        sampleName: wr.sampleName || '',
        targets: [...new Set(reactionTargets)],
      });
    }
  });

  if (wellMap.size === 0) return null;

  const wells = Array.from({ length: 96 }, (_, index) => {
    if (wellMap.has(index)) return wellMap.get(index);
    return {
      index,
      position: indexToPosition(index),
      sampleName: '',
      targets: [],
    };
  });

  return { wells };
}

function normalizeMethod(runMethodRaw) {
  if (!runMethodRaw) return null;

  const rawStages = runMethodRaw.stages || runMethodRaw.thermalCyclingStages || [];
  if (!rawStages.length) return null;

  const stages = rawStages.map((s) => ({
    type: s.type || s.stageType || s.name || 'STAGE',
    repeatCount: s.repeatCount ?? s.cycles ?? s.repeats ?? 1,
    steps: (s.steps || s.temperatureSteps || []).map((step) => ({
      temperature: step.temperature ?? step.temp ?? step.annealingTemperature ?? null,
      duration: step.holdTime ?? step.duration ?? step.time ?? step.seconds ?? null,
      collection: !!(step.collectionProfile || step.collectData),
    })),
  }));

  return {
    stages,
    sampleVolume: runMethodRaw.sampleVolume ?? runMethodRaw.volume ?? null,
    coverTemperature: runMethodRaw.coverTemperature ?? null,
  };
}

export async function parseEDS(arrayBuffer, fileName) {
  const zip = await JSZip.loadAsync(arrayBuffer);

  const [summary, plateSetupRaw, runMethodRaw, runSummary, analysisResult] = await Promise.all([
    readJSON(zip, 'summary.json'),
    readJSON(zip, 'setup/plate_setup.json'),
    readJSON(zip, 'setup/run_method.json'),
    readJSON(zip, 'run/run_summary.json'),
    readJSON(zip, 'primary/analysis_result.json'),
  ]);

  if (!analysisResult?.wellResults?.length) {
    throw new Error(
      'Invalid EDS file: missing analysis results. Make sure this is a QuantStudio .eds export.'
    );
  }

  const replicates = [];
  const curves = {};
  let cycleCount = 0;

  analysisResult.wellResults.forEach((wr) => {
    const position = indexToPosition(wr.wellIndex);
    (wr.reactionResults || []).forEach((r) => {
      const cq = r.amplificationResult?.cq ?? null;
      const task = r.task ?? null;
      const id = `well_${wr.wellIndex}_${r.targetName}`;
      replicates.push({
        id,
        well: position,
        sampleName: wr.sampleName || '',
        targetName: r.targetName,
        cq: cq === null || Number.isNaN(cq) ? null : cq,
        task,
        isNTC:
          /ntc|no.?template/i.test(task || '') || /ntc/i.test(wr.sampleName || ''),
      });

      const rn = r.amplificationResult?.rn ?? [];
      const deltaRn = r.amplificationResult?.deltaRn ?? [];
      if (rn.length > cycleCount) cycleCount = rn.length;
      curves[`${wr.wellIndex}-${r.targetName}`] = { rn, deltaRn };
    });
  });

  const plateSetup = buildPlateSetup(plateSetupRaw, analysisResult);
  const method = normalizeMethod(runMethodRaw);

  const runInfo = summary || runSummary
    ? {
        instrumentType:
          summary?.instrumentType ?? runSummary?.instrumentType ?? 'Unknown',
        serialNumber: runSummary?.instrumentSerialNumber ?? summary?.serialNumber ?? null,
        firmwareVersion: runSummary?.firmwareVersion ?? null,
        status: summary?.status ?? runSummary?.status ?? null,
        startTime: runSummary?.startTime ?? summary?.startTime ?? null,
        endTime: runSummary?.endTime ?? summary?.endTime ?? null,
        runMode: runMethodRaw?.runMode ?? runMethodRaw?.mode ?? null,
        experimentName: summary?.name ?? summary?.experimentName ?? fileName,
        passiveReference:
          plateSetupRaw?.passiveReference ?? plateSetupRaw?.passiveDye ?? null,
      }
    : null;

  return {
    source: 'eds',
    fileName,
    replicates,
    runInfo,
    plateSetup,
    method,
    ampCurves: cycleCount > 0 ? { cycleCount, curves } : null,
  };
}
