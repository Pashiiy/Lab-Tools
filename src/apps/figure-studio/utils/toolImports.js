/**
 * Adapters that turn analysis-tool snapshots / exports into read-only datasets.
 * Display aggregation only — never recompute scientific formulas.
 */
import { datasetFromMatrix } from '../model/dataset';

export function importColonySnapshot(state, { projectName } = {}) {
  const plates = state?.plates || [];
  const rows = [['Plate', 'Sample', 'Colonies', 'Category', 'Count']];
  if (!plates.length && Array.isArray(state?.dots)) {
    rows.push(['Active', state.sessionName || 'Session', String(state.dots.length), 'all', String(state.dots.length)]);
  }
  for (const p of plates) {
    const dots = p.dots || [];
    const byCat = {};
    for (const d of dots) {
      const k = d.categoryId || 'unknown';
      byCat[k] = (byCat[k] || 0) + 1;
    }
    const cats = Object.keys(byCat);
    if (!cats.length) {
      rows.push([p.name || p.id, p.sampleName || '', '0', '', '0']);
    } else {
      for (const [cat, n] of Object.entries(byCat)) {
        rows.push([p.name || p.id, p.sampleName || '', String(dots.length), cat, String(n)]);
      }
    }
  }
  return datasetFromMatrix(rows, {
    name: 'Colony Counter',
    readOnly: true,
    meta: {
      source: 'Colony Counter',
      projectName: projectName || null,
      generatedAt: new Date().toISOString(),
    },
  });
}

export function importEndpointSummary(rowsMatrix, { projectName } = {}) {
  const matrix =
    rowsMatrix?.length > 0
      ? rowsMatrix
      : [
          ['Sample', 'Category', 'Count'],
          ['A1', 'A', '12'],
          ['A1', 'B', '3'],
        ];
  return datasetFromMatrix(matrix, {
    name: 'Endpoint Analysis',
    readOnly: true,
    meta: {
      source: 'Endpoint Analysis',
      projectName: projectName || null,
      generatedAt: new Date().toISOString(),
    },
  });
}

export function importQPCRFoldChange(rowsMatrix, { projectName } = {}) {
  const matrix =
    rowsMatrix?.length > 0
      ? rowsMatrix
      : [
          ['Sample', 'Target', 'FoldChange', 'SEM'],
          ['WT', 'GeneA', '1.0', '0.1'],
          ['Mut', 'GeneA', '2.4', '0.3'],
        ];
  return datasetFromMatrix(matrix, {
    name: 'qPCR Fold Change',
    readOnly: true,
    meta: {
      source: 'qPCR Analysis',
      projectName: projectName || null,
      generatedAt: new Date().toISOString(),
    },
  });
}
