import { listThemes } from '../state/themesStore';

/** Publication / lab presets for Figure Studio */
export const FIGURE_PRESETS = {
  'lab-default': {
    id: 'lab-default',
    label: 'Lab Default',
    fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
    fontSize: 12,
    axisStroke: '#5c6570',
    grid: true,
    gridStroke: 'rgba(0,0,0,0.08)',
    colors: ['#2f6fed', '#0d9488', '#c2410c', '#7c3aed', '#ca8a04'],
    strokeWidth: 1.5,
    legend: true,
    exportDpi: 300,
  },
  nature: {
    id: 'nature',
    label: 'Nature',
    fontFamily: 'Helvetica, Arial, sans-serif',
    fontSize: 10,
    axisStroke: '#222',
    grid: false,
    gridStroke: 'transparent',
    colors: ['#4c72b0', '#55a868', '#c44e52', '#8172b3', '#ccb974'],
    strokeWidth: 1,
    legend: true,
    exportDpi: 600,
  },
  cell: {
    id: 'cell',
    label: 'Cell',
    fontFamily: 'Arial, sans-serif',
    fontSize: 11,
    axisStroke: '#111',
    grid: true,
    gridStroke: 'rgba(0,0,0,0.06)',
    colors: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'],
    strokeWidth: 2,
    legend: true,
    exportDpi: 300,
  },
  science: {
    id: 'science',
    label: 'Science',
    fontFamily: 'Georgia, serif',
    fontSize: 10,
    axisStroke: '#333',
    grid: false,
    gridStroke: 'transparent',
    colors: ['#0173b2', '#de8f05', '#029e73', '#cc78bc', '#ca9161'],
    strokeWidth: 1.25,
    legend: true,
    exportDpi: 300,
  },
  presentation: {
    id: 'presentation',
    label: 'Presentation',
    fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
    fontSize: 16,
    axisStroke: '#1a1a1a',
    grid: true,
    gridStroke: 'rgba(0,0,0,0.1)',
    colors: ['#2563eb', '#059669', '#dc2626', '#7c3aed', '#d97706'],
    strokeWidth: 2.5,
    legend: true,
    exportDpi: 150,
  },
};

export function getPreset(id) {
  const saved = listThemes().find((t) => t.id === id);
  if (saved) return { ...FIGURE_PRESETS['lab-default'], ...saved };
  return FIGURE_PRESETS[id] || FIGURE_PRESETS['lab-default'];
}
