const SAMPLE_PALETTE = [
  '#4b9cd3',
  '#50c878',
  '#f5a623',
  '#e05c5c',
  '#9b59b6',
  '#1abc9c',
  '#e67e22',
  '#2ecc71',
  '#e74c3c',
  '#3498db',
  '#f39c12',
  '#8e44ad',
];

export function assignSampleColors(replicates) {
  const samples = [
    ...new Set(replicates.filter((r) => !r.isNTC).map((r) => r.sampleName)),
  ].sort();

  const map = {};
  samples.forEach((s, i) => {
    map[s] = SAMPLE_PALETTE[i % SAMPLE_PALETTE.length];
  });
  map.NTC = '#6b7280';
  return map;
}
