/** Color helpers for ΔΔCt heatmap cells (kept out of Heatmap.jsx for Fast Refresh). */

export function foldChangeToColor(fc) {
  if (fc === null) return null;
  if (Math.abs(fc - 1) < 0.001) return 'rgba(255,255,255,0.06)';
  if (fc > 1) {
    const intensity = Math.min((fc - 1) / 4, 1);
    return `rgba(96, 165, 250, ${0.15 + intensity * 0.7})`;
  }
  const intensity = Math.min((1 - fc) / 0.9, 1);
  return `rgba(251, 146, 60, ${0.15 + intensity * 0.7})`;
}

export function rqToColor(rq, maxRq) {
  if (rq === null) return null;
  const intensity = Math.min(rq / (maxRq || 1), 1);
  return `rgba(45, 212, 191, ${0.1 + intensity * 0.75})`;
}
