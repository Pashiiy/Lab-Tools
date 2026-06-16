import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { parseDataFile } from '../utils/parseDataFile';
import { DEFAULT_CONFIG } from '../utils/chartTypes';

export function useFigureData(initialState = null) {
  const [loading, setLoading] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [config, setConfig] = useState({ ...DEFAULT_CONFIG });

  // Hydrate from a shell-restored `.labtools` project (once on mount).
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || !initialState?.rows?.length) return;
    hydratedRef.current = true;
    setHeaders(initialState.headers ?? []);
    setRows(initialState.rows ?? []);
    setFileName(initialState.fileName ?? '');
    setConfig({ ...DEFAULT_CONFIG, ...(initialState.config ?? {}) });
  }, [initialState]);

  const loadFile = useCallback(async (file) => {
    if (!file) return;
    setLoading(true);
    setParseError(null);
    try {
      const data = await parseDataFile(file);
      setHeaders(data.headers);
      setRows(data.rows);
      setFileName(data.fileName);
      const numericCols = data.headers.filter((h) =>
        data.rows.some((r) => Number.isFinite(Number(r[h])))
      );
      setConfig((prev) => ({
        ...prev,
        xColumn: data.headers[0] ?? '',
        yColumn: numericCols[0] ?? data.headers[1] ?? '',
        groupColumn: '',
        title: data.fileName.replace(/\.[^.]+$/, ''),
        xLabel: data.headers[0] ?? '',
        yLabel: numericCols[0] ?? '',
      }));
    } catch (e) {
      setParseError(e.message || 'Failed to parse file');
      setHeaders([]);
      setRows([]);
      setFileName('');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateConfig = useCallback((patch) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const previewRows = useMemo(() => rows.slice(0, 50), [rows]);

  const hasData = rows.length > 0;

  const getSnapshot = useCallback(
    () => (rows.length > 0 ? { fileName, headers, rows, config } : undefined),
    [fileName, headers, rows, config]
  );

  return {
    loading,
    parseError,
    fileName,
    headers,
    rows,
    previewRows,
    config,
    updateConfig,
    loadFile,
    hasData,
    getSnapshot,
  };
}
