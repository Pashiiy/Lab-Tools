export const TARGET_PALETTE = [
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

export const EMPTY_WELL = 'var(--lt-border)';

export function assignColors(items, palette = TARGET_PALETTE) {
  const map = {};
  items.forEach((item, i) => {
    map[item] = palette[i % palette.length];
  });
  return map;
}

export const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: '◉' },
  { id: 'raw-data', label: 'Raw Data', icon: '▤' },
  { id: 'averaged', label: 'Averaged', icon: '≡' },
  { id: 'ddct', label: 'ΔΔCt', icon: 'Δ' },
  { id: 'time-course', label: 'Time Course', icon: '⏱' },
  { id: 'standard-curve', label: 'Std Curve', icon: '⌇' },
];
