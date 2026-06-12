/** Publication-style chart theme — reads global design tokens */
export function getEndpointChartTheme() {
  const root = getComputedStyle(document.documentElement);

  const get = (token, fallback) =>
    root.getPropertyValue(token).trim() || fallback;

  const isLight = document.documentElement.getAttribute('data-theme') === 'light';

  return {
    tick: get('--lt-chart-tick', isLight ? '#4b5563' : '#9ca3af'),
    label: get('--lt-chart-label', isLight ? '#4b5563' : '#9ca3af'),
    text: get('--lt-chart-text', isLight ? '#13294b' : '#d1d5db'),
    count: get('--lt-text', isLight ? '#13294b' : '#f3f4f6'),
    grid: get('--lt-chart-grid', isLight ? 'rgba(19,41,75,0.1)' : 'rgba(156,163,175,0.15)'),
    cursor: get('--lt-hover', 'rgba(75,156,211,0.08)'),
    tooltipBg: get('--lt-chart-tooltip-bg', isLight ? '#ffffff' : '#1f2937'),
    tooltipBorder: get('--lt-chart-tooltip-border', isLight ? '#d1d9e6' : '#374151'),
    tooltipText: get('--lt-text', isLight ? '#13294b' : '#f3f4f6'),
    exportBg: get('--lt-panel', isLight ? '#ffffff' : '#1f2937'),
    barLabel: '#ffffff',
    axis: get('--lt-chart-axis', '#6b7280'),
  };
}
