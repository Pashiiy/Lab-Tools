export function getEndpointChartTheme() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';

  if (isLight) {
    return {
      tick: '#52525b',
      label: '#71717a',
      text: '#3f3f46',
      count: '#1a1a1e',
      grid: 'rgba(0, 0, 0, 0.08)',
      cursor: 'rgba(0, 0, 0, 0.04)',
      tooltipBg: '#ffffff',
      tooltipBorder: 'rgba(0, 0, 0, 0.12)',
      tooltipText: '#1a1a1e',
      exportBg: '#ffffff',
      barLabel: '#ffffff',
    };
  }

  return {
    tick: '#aaaaaa',
    label: '#888888',
    text: '#cccccc',
    count: '#ffffff',
    grid: 'rgba(255, 255, 255, 0.06)',
    cursor: 'rgba(255, 255, 255, 0.04)',
    tooltipBg: '#1e1e28',
    tooltipBorder: 'rgba(255, 255, 255, 0.1)',
    tooltipText: '#e8e8ec',
    exportBg: '#16161c',
    barLabel: '#ffffff',
  };
}
