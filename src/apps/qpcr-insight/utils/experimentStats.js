export function getUniqueTargets(replicates) {
  return [...new Set(replicates.map((r) => r.targetName).filter(Boolean))].sort();
}

export function getUniqueSamples(replicates) {
  return [...new Set(replicates.map((r) => r.sampleName).filter(Boolean))].sort();
}

export function getUniqueWells(replicates) {
  return new Set(replicates.map((r) => r.well).filter(Boolean)).size;
}

export function formatEpochTime(ms) {
  if (ms == null || Number.isNaN(ms)) return '—';
  return new Date(ms).toLocaleString();
}

export function formatDuration(startMs, endMs) {
  if (startMs == null || endMs == null) return '—';
  const seconds = Math.round((endMs - startMs) / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatHoldDuration(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return '—';
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, '0')}`;
}

export function getTotalCycles(method) {
  if (!method?.stages) return null;
  return method.stages.reduce((sum, stage) => {
    const repeats = stage.repeatCount ?? 1;
    const collectionSteps = (stage.steps || []).filter((s) => s.collection).length;
    return sum + repeats * collectionSteps;
  }, 0);
}
