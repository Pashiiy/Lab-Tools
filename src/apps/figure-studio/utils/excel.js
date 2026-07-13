import * as XLSX from 'xlsx';
import { parseCsvOrTsv } from './csv';

/**
 * Read first sheet (or named sheet) of an Excel file into a string matrix.
 */
export async function parseExcelFile(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { matrix: [], sheetName: null, sheetNames: [] };
  const sheet = wb.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });
  const normalized = matrix.map((row) =>
    (Array.isArray(row) ? row : []).map((c) => (c == null ? '' : String(c)))
  );
  return {
    matrix: normalized,
    sheetName,
    sheetNames: wb.SheetNames,
  };
}

export function matrixFromClipboardText(text) {
  return parseCsvOrTsv(text);
}
