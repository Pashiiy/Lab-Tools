import {
  createEmptyFigureStudioState,
  datasetFromMatrix,
  genId,
} from '../model/dataset';

const TEMPLATES = {
  'qpcr-fold': {
    label: 'qPCR Fold Change',
    matrix: [
      ['Sample', 'FoldChange', 'Group'],
      ['WT', '1.0', 'Control'],
      ['WT', '1.1', 'Control'],
      ['WT', '0.9', 'Control'],
      ['Mut', '2.2', 'Mutant'],
      ['Mut', '2.5', 'Mutant'],
      ['Mut', '2.0', 'Mutant'],
    ],
    plot: { type: 'bar', errorMode: 'sem', stacked: false, horizontal: false },
  },
  'time-course': {
    label: 'Time Course',
    matrix: [
      ['Time', 'OD', 'Strain'],
      ['0', '0.05', 'WT'],
      ['2', '0.12', 'WT'],
      ['4', '0.35', 'WT'],
      ['6', '0.7', 'WT'],
      ['0', '0.05', 'Mut'],
      ['2', '0.08', 'Mut'],
      ['4', '0.2', 'Mut'],
      ['6', '0.4', 'Mut'],
    ],
    plot: { type: 'line', errorMode: 'sem' },
  },
  'colony-counts': {
    label: 'Colony Counts',
    matrix: [
      ['Condition', 'CFU', 'Replicate'],
      ['Control', '120', '1'],
      ['Control', '135', '2'],
      ['Control', '128', '3'],
      ['Treated', '45', '1'],
      ['Treated', '52', '2'],
      ['Treated', '48', '3'],
    ],
    plot: { type: 'bar', errorMode: 'sd' },
  },
  'repair-stack': {
    label: 'Repair Product Distribution',
    matrix: [
      ['Sample', 'Percent', 'Product'],
      ['A', '55', 'Product A'],
      ['A', '30', 'Product B'],
      ['A', '15', 'Product C'],
      ['B', '40', 'Product A'],
      ['B', '35', 'Product B'],
      ['B', '25', 'Product C'],
    ],
    plot: { type: 'bar', stacked: true, errorMode: 'sem' },
  },
  growth: {
    label: 'Growth Curves',
    matrix: [
      ['Time_h', 'OD600', 'Culture'],
      ['0', '0.1', 'A'],
      ['1', '0.18', 'A'],
      ['2', '0.4', 'A'],
      ['3', '0.9', 'A'],
      ['4', '1.4', 'A'],
      ['0', '0.1', 'B'],
      ['1', '0.15', 'B'],
      ['2', '0.28', 'B'],
      ['3', '0.55', 'B'],
      ['4', '0.85', 'B'],
    ],
    plot: { type: 'line', errorMode: 'sem' },
  },
};

export function listBiologyTemplates() {
  return Object.entries(TEMPLATES).map(([id, t]) => ({ id, label: t.label }));
}

/**
 * Returns a new Figure Studio state with template dataset + mapping.
 */
export function applyTemplate(currentState, templateId) {
  const t = TEMPLATES[templateId];
  if (!t) return null;
  const base = currentState?.version ? JSON.parse(JSON.stringify(currentState)) : createEmptyFigureStudioState();
  const ds = datasetFromMatrix(t.matrix, { name: t.label, readOnly: false });
  const xCol = ds.columns[0]?.id;
  const yCol = ds.columns[1]?.id;
  const gCol = ds.columns[2]?.id || null;
  base.datasets = [...base.datasets, ds];
  base.activeDatasetId = ds.id;
  base.plot = {
    ...base.plot,
    ...t.plot,
    xColumnId: xCol,
    yColumnId: yCol,
    groupColumnId: gCol,
    colorColumnId: null,
    replicateColumnId: null,
    errorColumnId: null,
  };
  base.figure = {
    id: genId('fig'),
    name: t.label,
    layout: '1x1',
    panels: [{ id: genId('panel'), letter: 'A', plotType: t.plot.type }],
  };
  return base;
}
