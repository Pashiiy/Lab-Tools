import * as XLSX from 'xlsx';

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { headers: [], rows: [] };

  const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
  const headers = splitCSVLine(lines[0], delimiter);
  const rows = lines.slice(1).map((line) => {
    const cells = splitCSVLine(line, delimiter);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = coerceValue(cells[i] ?? '');
    });
    return row;
  });
  return { headers, rows };
}

function splitCSVLine(line, delimiter) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function coerceValue(raw) {
  const v = String(raw).replace(/^"|"$/g, '').trim();
  if (v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}

function sheetToTable(sheet) {
  const arr = XLSX.utils.sheet_to_json(sheet, { defval: null });
  if (!arr.length) return { headers: [], rows: [] };
  const headers = Object.keys(arr[0]);
  const rows = arr.map((row) => {
    const out = {};
    headers.forEach((h) => {
      const v = row[h];
      out[h] = typeof v === 'number' ? v : v == null || v === '' ? null : String(v);
    });
    return out;
  });
  return { headers, rows };
}

export async function parseDataFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    const text = await file.text();
    return { ...parseCSV(text), fileName: file.name };
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return { ...sheetToTable(sheet), fileName: file.name };
  }
  throw new Error('Unsupported format. Use CSV, XLSX, or XLS.');
}
