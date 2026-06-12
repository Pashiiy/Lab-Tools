export const SAMPLE_PALETTE = [
  '#4A90D9', '#50C878', '#F5A623', '#E05C5C', '#9B59B6',
  '#1ABC9C', '#E67E22', '#2ECC71', '#E74C3C', '#3498DB',
  '#F39C12', '#8E44AD',
];

export const COLUMN_MAP = {
  CT: 'ct',
  Ct: 'ct',
  CQ: 'ct',
  Cq: 'ct',
  'C(T)': 'ct',
  'Sample Name': 'sampleName',
  Sample: 'sampleName',
  'Target Name': 'targetName',
  Target: 'targetName',
  Detector: 'targetName',
  Well: 'well',
  'Well Position': 'wellPosition',
  Task: 'task',
  'Task Name': 'task',
  'Amp Status': 'ampStatus',
  'Amplification Status': 'ampStatus',
  'Ct Threshold': 'ctThreshold',
  'CT Threshold': 'ctThreshold',
  'CT SD': 'ctSd',
  'Ct SD': 'ctSd',
  'StdDev CT': 'ctSd',
};

export const THEME = {
  bg: '#0D1117',
  panel: '#161B22',
  border: 'rgba(255,255,255,0.08)',
  accent: '#58A6FF',
  positive: '#3FB950',
  warning: '#D29922',
  error: '#F85149',
  text: '#E6EDF3',
  textMuted: '#8B949E',
  tableHeader: '#21262D',
  hover: 'rgba(88,166,255,0.06)',
  tabHover: 'rgba(88,166,255,0.08)',
};

export const TARGET_PALETTE = [
  '#58A6FF', '#50C878', '#F5A623', '#E05C5C', '#9B59B6',
  '#1ABC9C', '#E67E22', '#2ECC71', '#E74C3C', '#3498DB',
  '#F39C12', '#8E44AD',
];

export const EMPTY_WELL = '#2A2D35';

export function assignSampleColors(samples) {
  const map = {};
  samples.forEach((s, i) => {
    map[s] = SAMPLE_PALETTE[i % SAMPLE_PALETTE.length];
  });
  return map;
}

export function assignTargetColors(targets) {
  const map = {};
  targets.forEach((t, i) => {
    map[t] = TARGET_PALETTE[i % TARGET_PALETTE.length];
  });
  return map;
}

export function indexToPosition(i) {
  const row = String.fromCharCode(65 + Math.floor(i / 12));
  const col = (i % 12) + 1;
  return `${row}${col}`;
}

export function positionToIndex(pos) {
  const match = String(pos).trim().match(/^([A-Ha-h])(\d{1,2})$/);
  if (!match) return -1;
  const row = match[1].toUpperCase().charCodeAt(0) - 65;
  const col = parseInt(match[2], 10) - 1;
  if (row < 0 || row > 7 || col < 0 || col > 11) return -1;
  return row * 12 + col;
}
