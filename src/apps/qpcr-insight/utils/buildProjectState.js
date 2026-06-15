export function buildProjectState({
  experiment,
  referenceGene,
  calibratorSample,
  timeCourseExport,
  ...extras
}) {
  return {
    version: 1,
    placeholder: true,
    fileName: experiment?.fileName ?? null,
    source: experiment?.source ?? null,
    referenceGene: referenceGene || null,
    calibratorSample: calibratorSample || null,
    timeCourseExport: timeCourseExport || null,
    exportedAt: new Date().toISOString(),
    ...extras,
  };
}
