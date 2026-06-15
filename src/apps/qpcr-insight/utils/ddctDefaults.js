export function getDefaultReferenceGene(averagedData, targets) {
  const samples = [...new Set(averagedData.map((r) => r.sampleName))];
  const sorted = [...targets].sort();
  const inAllSamples = sorted.filter((target) =>
    samples.every((sample) =>
      averagedData.some(
        (r) => r.sampleName === sample && r.targetName === target && r.meanCq !== null
      )
    )
  );
  return inAllSamples[0] || sorted[0] || '';
}
