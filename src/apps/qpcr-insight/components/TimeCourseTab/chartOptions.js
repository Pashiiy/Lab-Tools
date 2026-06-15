export const STORAGE_KEY = 'qpcrInsight_timeCourseOptions';

export const DEFAULT_VIEW_OPTIONS = {
  yAxisScale: 'linear',
  showErrorBands: true,
  lineStyle: 'smooth',
  showDataPoints: 'always',
  combineDilutions: false,
  dilutionLabels: true,
};

export const DEFAULT_CHART_OPTIONS = {
  percent: { ...DEFAULT_VIEW_OPTIONS },
  fold: { ...DEFAULT_VIEW_OPTIONS },
  absolute: { ...DEFAULT_VIEW_OPTIONS },
  ratio: {
    ...DEFAULT_VIEW_OPTIONS,
    showErrorBands: false,
  },
};

export function loadChartOptions() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_CHART_OPTIONS };
    const parsed = JSON.parse(stored);
    return {
      percent: { ...DEFAULT_VIEW_OPTIONS, ...parsed.percent },
      fold: { ...DEFAULT_VIEW_OPTIONS, ...parsed.fold },
      absolute: { ...DEFAULT_VIEW_OPTIONS, ...parsed.absolute },
      ratio: { ...DEFAULT_VIEW_OPTIONS, showErrorBands: false, ...parsed.ratio },
    };
  } catch {
    return { ...DEFAULT_CHART_OPTIONS };
  }
}

export function saveChartOptions(options) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
  } catch {
    // ignore quota errors
  }
}

export function getLineType(lineStyle) {
  return lineStyle === 'smooth' ? 'monotone' : 'linear';
}

export function getDotProps(showDataPoints) {
  if (showDataPoints === 'never') return false;
  if (showDataPoints === 'hover') return { r: 3 };
  return { r: 4 };
}

export function getActiveDotProps(showDataPoints) {
  if (showDataPoints === 'never') return false;
  return { r: 5 };
}
