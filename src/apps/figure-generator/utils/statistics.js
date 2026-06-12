export function mean(values) {
  const nums = values.filter((v) => Number.isFinite(v));
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function stdDev(values) {
  const nums = values.filter((v) => Number.isFinite(v));
  if (nums.length < 2) return 0;
  const m = mean(nums);
  const variance = nums.reduce((s, v) => s + (v - m) ** 2, 0) / (nums.length - 1);
  return Math.sqrt(variance);
}

export function sem(values) {
  const nums = values.filter((v) => Number.isFinite(v));
  if (nums.length < 2) return 0;
  return stdDev(nums) / Math.sqrt(nums.length);
}

export function groupNumeric(rows, xCol, yCol, groupCol) {
  if (!groupCol) {
    const values = rows
      .map((r) => Number(r[yCol]))
      .filter((v) => Number.isFinite(v));
    return [{ group: 'All', values, x: 'All' }];
  }

  const map = new Map();
  rows.forEach((row) => {
    const g = String(row[groupCol] ?? '—');
    const y = Number(row[yCol]);
    if (!Number.isFinite(y)) return;
    if (!map.has(g)) map.set(g, []);
    map.get(g).push(y);
  });

  return [...map.entries()].map(([group, values]) => ({
    group,
    values,
    x: group,
  }));
}

export function aggregateForBar(rows, xCol, yCol, groupCol, errorMode) {
  if (groupCol) {
    const xGroups = new Map();
    rows.forEach((row) => {
      const x = String(row[xCol] ?? '—');
      const g = String(row[groupCol] ?? '—');
      const y = Number(row[yCol]);
      if (!Number.isFinite(y)) return;
      const key = `${x}::${g}`;
      if (!xGroups.has(key)) {
        xGroups.set(key, { x, group: g, values: [] });
      }
      xGroups.get(key).values.push(y);
    });
    return [...xGroups.values()].map((item) => ({
      x: item.x,
      group: item.group,
      y: mean(item.values),
      error: errorMode === 'sem' ? sem(item.values) : errorMode === 'sd' ? stdDev(item.values) : 0,
      n: item.values.length,
    }));
  }

  const map = new Map();
  rows.forEach((row) => {
    const x = String(row[xCol] ?? '—');
    const y = Number(row[yCol]);
    if (!Number.isFinite(y)) return;
    if (!map.has(x)) map.set(x, []);
    map.get(x).push(y);
  });

  return [...map.entries()].map(([x, values]) => ({
    x,
    group: null,
    y: mean(values),
    error: errorMode === 'sem' ? sem(values) : errorMode === 'sd' ? stdDev(values) : 0,
    n: values.length,
  }));
}
