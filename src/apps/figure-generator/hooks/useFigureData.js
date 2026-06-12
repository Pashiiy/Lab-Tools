import { useState, useCallback, useMemo } from 'react';
import { parseDataFile } from '../utils/parseDataFile';
import { DEFAULT_CONFIG } from '../utils/chartTypes';

export function useFigureData() {
  const [loading, setLoading] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [config, setConfig] = useState({ ...DEFAULT_CONFIG });

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
  };
}
