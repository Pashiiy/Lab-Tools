/**
 * Figure Studio dataset model — visualization only; never recomputes science.
 */

let idSeq = 0;
export function genId(prefix = 'fs') {
  idSeq += 1;
  return `${prefix}-${Date.now().toString(36)}-${idSeq.toString(36)}`;
}

export function createColumn(name, { type = 'auto' } = {}) {
  return { id: genId('col'), name: String(name || 'Column'), type };
}

export function createEmptyDataset({ name = 'Dataset 1', cols = 3, rows = 8 } = {}) {
  const columns = Array.from({ length: cols }, (_, i) =>
    createColumn(i === 0 ? 'X' : i === 1 ? 'Y' : `Col ${i + 1}`)
  );
  const data = Array.from({ length: rows }, () => columns.map(() => ''));
  return {
    id: genId('ds'),
    name,
    columns,
    data,
    readOnly: false,
    source: null,
    projectName: null,
    generatedAt: null,
  };
}

export function datasetFromMatrix(matrix, { name = 'Imported', readOnly = false, meta = {} } = {}) {
  if (!matrix?.length) return createEmptyDataset({ name, cols: 2, rows: 4 });
  const header = matrix[0].map((c, i) => String(c ?? `Col ${i + 1}`));
  const columns = header.map((h) => createColumn(h));
  const body = matrix.slice(1).map((row) => {
    const cells = columns.map((_, i) => (row[i] == null ? '' : String(row[i])));
    while (cells.length < columns.length) cells.push('');
    return cells;
  });
  return {
    id: genId('ds'),
    name,
    columns,
    data: body.length ? body : [columns.map(() => '')],
    readOnly: Boolean(readOnly),
    source: meta.source || null,
    projectName: meta.projectName || null,
    generatedAt: meta.generatedAt || null,
  };
}

export function duplicateDataset(ds) {
  const copy = JSON.parse(JSON.stringify(ds));
  copy.id = genId('ds');
  copy.name = `${ds.name} (copy)`;
  copy.readOnly = false;
  return copy;
}

export function createEmptyFigureStudioState() {
  const ds = createEmptyDataset();
  return {
    version: 1,
    datasets: [ds],
    activeDatasetId: ds.id,
    // Plot mapping (Phase 2–3)
    plot: {
      type: 'bar',
      xColumnId: ds.columns[0]?.id || null,
      yColumnId: ds.columns[1]?.id || null,
      groupColumnId: null,
      colorColumnId: null,
      replicateColumnId: null,
      errorColumnId: null,
      errorMode: 'sem', // sd | sem | ci | custom
      stacked: false,
      horizontal: false,
    },
    // Figure / panels (Phase 5)
    figure: {
      id: genId('fig'),
      name: 'Figure 1',
      layout: '1x1',
      panels: [{ id: genId('panel'), letter: 'A', plotType: 'bar' }],
    },
    presetId: 'lab-default',
    themeId: null,
  };
}

export function getActiveDataset(state) {
  return state.datasets.find((d) => d.id === state.activeDatasetId) || state.datasets[0] || null;
}

/** Coerce cell to number when possible */
export function cellNumber(v) {
  if (v === '' || v == null) return null;
  const n = Number(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
}
