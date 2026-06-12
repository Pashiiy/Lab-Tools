export const CHART_TYPES = [
  { id: 'bar', label: 'Bar Chart' },
  { id: 'groupedBar', label: 'Grouped Bar' },
  { id: 'scatter', label: 'Scatter Plot' },
  { id: 'line', label: 'Line Graph' },
  { id: 'box', label: 'Box Plot' },
  { id: 'violin', label: 'Violin Plot' },
  { id: 'histogram', label: 'Histogram' },
];

export const ERROR_MODES = [
  { id: 'none', label: 'None' },
  { id: 'sd', label: 'Mean ± SD' },
  { id: 'sem', label: 'Mean ± SEM' },
];

export const LEGEND_POSITIONS = [
  { id: 'top', label: 'Top' },
  { id: 'bottom', label: 'Bottom' },
  { id: 'right', label: 'Right' },
  { id: 'left', label: 'Left' },
];

export const DEFAULT_CONFIG = {
  chartType: 'bar',
  xColumn: '',
  yColumn: '',
  groupColumn: '',
  title: '',
  xLabel: '',
  yLabel: '',
  fontSize: 12,
  titleSize: 14,
  width: 640,
  height: 420,
  legendPosition: 'right',
  errorMode: 'none',
  showLegend: true,
  histogramBins: 12,
};

export const CHART_COLORS = [
  '#2e8b57',
  '#4b9cd3',
  '#d4a72c',
  '#c45c5c',
  '#7dcea0',
  '#a78bfa',
  '#f472b6',
  '#60a5fa',
];
