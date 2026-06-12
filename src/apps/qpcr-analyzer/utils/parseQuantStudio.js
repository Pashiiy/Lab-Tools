import * as XLSX from 'xlsx';
import { COLUMN_MAP } from '../constants/palette';

function normalizeRow(raw) {
  const normalized = {};
  Object.entries(raw).forEach(([key, value]) => {
    const mappedKey = COLUMN_MAP[key.trim()] || key.trim();
    normalized[mappedKey] = value;
  });

  const rawCt = normalized.ct;
  normalized.ct =
    rawCt === '' || rawCt === undefined || /undetermined/i.test(String(rawCt))
      ? null
      : parseFloat(rawCt);

  normalized.isUndetermined = normalized.ct === null || Number.isNaN(normalized.ct);
  if (Number.isNaN(normalized.ct)) normalized.ct = null;

  normalized.isNTC = /ntc|no.?template/i.test(String(normalized.task || ''));

  const rawSd = normalized.ctSd;
  if (rawSd !== '' && rawSd !== undefined && !Number.isNaN(parseFloat(rawSd))) {
    normalized.ctSd = parseFloat(rawSd);
  } else {
    normalized.ctSd = null;
  }

  normalized.sampleName = String(normalized.sampleName ?? '').trim();
  normalized.targetName = String(normalized.targetName ?? '').trim();
  normalized.wellPosition = String(
    normalized.wellPosition || normalized.well || ''
  ).trim();

  return normalized;
}

export function parseQuantStudioFile(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const sheetName =
    workbook.SheetNames.find((n) => /result/i.test(n)) || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const headerIdx = raw.findIndex((row) =>
    row.some(
      (cell) =>
        /^sample\s*name$/i.test(String(cell).trim()) ||
        /^well\s*position$/i.test(String(cell).trim())
    )
  );

  if (headerIdx === -1) {
    throw new Error(
      'Could not find data table in this file. Make sure you are uploading a QuantStudio Results export.'
    );
  }

  const headers = raw[headerIdx].map((h) => String(h).trim());

  const rows = raw
    .slice(headerIdx + 1)
    .filter((row) => row.some((cell) => cell !== ''))
    .map((row, index) => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] ?? '';
      });
      const normalized = normalizeRow(obj);
      normalized._id = `row_${index}`;
      normalized._original = { ...obj };
      return normalized;
    });

  return { headers, rows };
}
