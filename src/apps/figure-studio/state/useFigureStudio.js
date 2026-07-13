import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import {
  createColumn,
  createEmptyDataset,
  createEmptyFigureStudioState,
  datasetFromMatrix,
  duplicateDataset,
  getActiveDataset,
} from '../model/dataset';
import { parseCsvOrTsv } from '../utils/csv';
import { matrixFromClipboardText, parseExcelFile } from '../utils/excel';
import {
  importColonySnapshot,
  importEndpointSummary,
  importQPCRFoldChange,
} from '../utils/toolImports';

const MAX_HISTORY = 80;

function cloneState(s) {
  return JSON.parse(JSON.stringify(s));
}

function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return action.state;
    case 'SET':
      return action.state;
    default:
      return state;
  }
}

export function useFigureStudio(initialState = null) {
  const [state, dispatch] = useReducer(
    reducer,
    null,
    () => (initialState?.version ? cloneState(initialState) : createEmptyFigureStudioState())
  );
  const historyRef = useRef([cloneState(state)]);
  const historyIndexRef = useRef(0);
  const hydratedRef = useRef(false);
  const [, forceHistory] = useReducer((n) => n + 1, 0);

  const push = useCallback((next) => {
    const snap = cloneState(next);
    const hist = historyRef.current.slice(0, historyIndexRef.current + 1);
    hist.push(snap);
    if (hist.length > MAX_HISTORY) hist.shift();
    historyRef.current = hist;
    historyIndexRef.current = hist.length - 1;
    forceHistory();
    dispatch({ type: 'SET', state: snap });
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    forceHistory();
    dispatch({ type: 'SET', state: cloneState(historyRef.current[historyIndexRef.current]) });
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    forceHistory();
    dispatch({ type: 'SET', state: cloneState(historyRef.current[historyIndexRef.current]) });
  }, []);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  useEffect(() => {
    if (!initialState?.version || hydratedRef.current) return;
    hydratedRef.current = true;
    const snap = cloneState(initialState);
    historyRef.current = [snap];
    historyIndexRef.current = 0;
    forceHistory();
    dispatch({ type: 'HYDRATE', state: snap });
  }, [initialState]);

  const activeDataset = useMemo(() => getActiveDataset(state), [state]);

  const updateActiveDataset = useCallback(
    (updater) => {
      const ds = getActiveDataset(state);
      if (!ds) return;
      if (ds.readOnly) return;
      const nextDs = typeof updater === 'function' ? updater(ds) : { ...ds, ...updater };
      push({
        ...state,
        datasets: state.datasets.map((d) => (d.id === ds.id ? nextDs : d)),
      });
    },
    [state, push]
  );

  const setCell = useCallback(
    (row, col, value) => {
      updateActiveDataset((ds) => {
        const data = ds.data.map((r) => [...r]);
        if (!data[row]) return ds;
        data[row][col] = value;
        return { ...ds, data };
      });
    },
    [updateActiveDataset]
  );

  const addDataset = useCallback(() => {
    const ds = createEmptyDataset({ name: `Dataset ${state.datasets.length + 1}` });
    push({ ...state, datasets: [...state.datasets, ds], activeDatasetId: ds.id });
  }, [state, push]);

  const selectDataset = useCallback(
    (id) => {
      if (!state.datasets.some((d) => d.id === id)) return;
      dispatch({ type: 'SET', state: { ...state, activeDatasetId: id } });
    },
    [state]
  );

  const renameDataset = useCallback(
    (id, name) => {
      push({
        ...state,
        datasets: state.datasets.map((d) => (d.id === id ? { ...d, name } : d)),
      });
    },
    [state, push]
  );

  const dupDataset = useCallback(
    (id) => {
      const src = state.datasets.find((d) => d.id === id);
      if (!src) return;
      const copy = duplicateDataset(src);
      push({ ...state, datasets: [...state.datasets, copy], activeDatasetId: copy.id });
    },
    [state, push]
  );

  const deleteDataset = useCallback(
    (id) => {
      if (state.datasets.length <= 1) return;
      const datasets = state.datasets.filter((d) => d.id !== id);
      push({
        ...state,
        datasets,
        activeDatasetId:
          state.activeDatasetId === id ? datasets[0].id : state.activeDatasetId,
      });
    },
    [state, push]
  );

  const insertRow = useCallback(
    (at) => {
      updateActiveDataset((ds) => {
        const row = ds.columns.map(() => '');
        const data = [...ds.data];
        data.splice(at, 0, row);
        return { ...ds, data };
      });
    },
    [updateActiveDataset]
  );

  const deleteRow = useCallback(
    (at) => {
      updateActiveDataset((ds) => {
        if (ds.data.length <= 1) return ds;
        const data = ds.data.filter((_, i) => i !== at);
        return { ...ds, data };
      });
    },
    [updateActiveDataset]
  );

  const insertColumn = useCallback(
    (at) => {
      updateActiveDataset((ds) => {
        const col = createColumn(`Col ${ds.columns.length + 1}`);
        const columns = [...ds.columns];
        columns.splice(at, 0, col);
        const data = ds.data.map((row) => {
          const r = [...row];
          r.splice(at, 0, '');
          return r;
        });
        return { ...ds, columns, data };
      });
    },
    [updateActiveDataset]
  );

  const deleteColumn = useCallback(
    (at) => {
      updateActiveDataset((ds) => {
        if (ds.columns.length <= 1) return ds;
        const columns = ds.columns.filter((_, i) => i !== at);
        const data = ds.data.map((row) => row.filter((_, i) => i !== at));
        return { ...ds, columns, data };
      });
    },
    [updateActiveDataset]
  );

  const renameColumn = useCallback(
    (at, name) => {
      updateActiveDataset((ds) => ({
        ...ds,
        columns: ds.columns.map((c, i) => (i === at ? { ...c, name } : c)),
      }));
    },
    [updateActiveDataset]
  );

  const importMatrix = useCallback(
    (matrix, { name, readOnly, meta } = {}) => {
      const ds = datasetFromMatrix(matrix, { name, readOnly, meta });
      push({ ...state, datasets: [...state.datasets, ds], activeDatasetId: ds.id });
    },
    [state, push]
  );

  const importCsvText = useCallback(
    (text, name = 'CSV Import') => {
      importMatrix(parseCsvOrTsv(text), { name });
    },
    [importMatrix]
  );

  const importExcel = useCallback(
    async (file) => {
      const { matrix, sheetName } = await parseExcelFile(file);
      importMatrix(matrix, { name: sheetName || file.name || 'Excel Import' });
    },
    [importMatrix]
  );

  const pasteClipboard = useCallback(
    (text) => {
      const matrix = matrixFromClipboardText(text);
      if (!matrix.length) return;
      // If single cell / small paste into selection handled by table; here replace/import
      importMatrix(matrix, { name: 'Pasted data' });
    },
    [importMatrix]
  );

  const importDemoTool = useCallback(
    (kind) => {
      let ds;
      if (kind === 'colony') {
        ds = importColonySnapshot({
          plates: [
            {
              id: 'p1',
              name: 'Plate 1',
              sampleName: 'WT',
              dots: [
                { categoryId: 'A' },
                { categoryId: 'A' },
                { categoryId: 'B' },
              ],
            },
            {
              id: 'p2',
              name: 'Plate 2',
              sampleName: 'Mut',
              dots: [{ categoryId: 'A' }, { categoryId: 'C' }],
            },
          ],
        });
      } else if (kind === 'endpoint') ds = importEndpointSummary();
      else ds = importQPCRFoldChange();
      push({ ...state, datasets: [...state.datasets, ds], activeDatasetId: ds.id });
    },
    [state, push]
  );

  const setPlot = useCallback(
    (partial) => {
      push({ ...state, plot: { ...state.plot, ...partial } });
    },
    [state, push]
  );

  const setPresetId = useCallback(
    (presetId) => {
      push({ ...state, presetId });
    },
    [state, push]
  );

  const getSnapshot = useCallback(() => cloneState(state), [state]);

  const applyFullState = useCallback((next) => {
    const snap = cloneState(next);
    const hist = historyRef.current.slice(0, historyIndexRef.current + 1);
    hist.push(snap);
    if (hist.length > MAX_HISTORY) hist.shift();
    historyRef.current = hist;
    historyIndexRef.current = hist.length - 1;
    forceHistory();
    dispatch({ type: 'SET', state: snap });
  }, []);

  return {
    state,
    activeDataset,
    canUndo,
    canRedo,
    undo,
    redo,
    setCell,
    addDataset,
    selectDataset,
    renameDataset,
    dupDataset,
    deleteDataset,
    insertRow,
    deleteRow,
    insertColumn,
    deleteColumn,
    renameColumn,
    importCsvText,
    importExcel,
    pasteClipboard,
    importDemoTool,
    setPlot,
    setPresetId,
    applyFullState,
    getSnapshot,
  };
}
