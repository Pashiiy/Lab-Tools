import { cellNumber } from '../model/dataset';

/**
 * Build chart series from dataset + plot mapping (display aggregations only).
 */
export function buildChartModel(dataset, plot) {
  if (!dataset || !plot) return { points: [], series: [], error: 'No data' };

  const colIndex = (id) => dataset.columns.findIndex((c) => c.id === id);
  const xi = colIndex(plot.xColumnId);
  const yi = colIndex(plot.yColumnId);
  if (xi < 0 || yi < 0) {
    return { points: [], series: [], error: 'Select X and Y columns' };
  }

  const gi = plot.groupColumnId ? colIndex(plot.groupColumnId) : -1;
  const ei = plot.errorColumnId ? colIndex(plot.errorColumnId) : -1;

  const raw = [];
  for (const row of dataset.data) {
    const x = row[xi];
    const y = cellNumber(row[yi]);
    if (x === '' || x == null || y == null) continue;
    raw.push({
      x: String(x),
      y,
      group: gi >= 0 ? String(row[gi] || 'Group') : 'Value',
      errorCustom: ei >= 0 ? cellNumber(row[ei]) : null,
    });
  }

  if (!raw.length) return { points: [], series: [], error: 'No numeric Y values' };

  // Aggregate by x + group
  const bucket = new Map();
  for (const p of raw) {
    const key = `${p.group}|||${p.x}`;
    if (!bucket.has(key)) bucket.set(key, []);
    bucket.get(key).push(p);
  }

  const groups = [...new Set(raw.map((p) => p.group))];
  const xs = [...new Set(raw.map((p) => p.x))];

  const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const sd = (arr) => {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
  };
  const sem = (arr) => (arr.length ? sd(arr) / Math.sqrt(arr.length) : 0);
  const ci95 = (arr) => 1.96 * sem(arr);

  const points = xs.map((x) => {
    const row = { name: x };
    for (const g of groups) {
      const key = `${g}|||${x}`;
      const items = bucket.get(key) || [];
      const ys = items.map((i) => i.y);
      if (!ys.length) {
        row[g] = null;
        row[`${g}_err`] = null;
        continue;
      }
      row[g] = mean(ys);
      let err = 0;
      if (plot.errorMode === 'custom') {
        const customs = items.map((i) => i.errorCustom).filter((n) => n != null);
        err = customs.length ? mean(customs) : 0;
      } else if (plot.errorMode === 'sd') err = sd(ys);
      else if (plot.errorMode === 'ci') err = ci95(ys);
      else err = sem(ys);
      row[`${g}_err`] = err;
      row[`${g}_n`] = ys.length;
      row[`${g}_reps`] = ys;
    }
    return row;
  });

  return { points, series: groups, error: null, raw };
}
