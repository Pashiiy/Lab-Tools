/**
 * Parse CSV / TSV text into a string matrix (rows × cols).
 * Handles quoted fields and commas/tabs.
 */
export function parseDelimited(text, delimiter = ',') {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  const src = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === delimiter) {
      row.push(cell);
      cell = '';
      continue;
    }
    if (ch === '\n') {
      row.push(cell);
      cell = '';
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
      continue;
    }
    cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c !== '')) rows.push(row);

  // Normalize column count
  const width = rows.reduce((m, r) => Math.max(m, r.length), 0);
  return rows.map((r) => {
    const copy = [...r];
    while (copy.length < width) copy.push('');
    return copy;
  });
}

export function detectDelimiter(text) {
  const sample = String(text || '').slice(0, 2000);
  const tabs = (sample.match(/\t/g) || []).length;
  const commas = (sample.match(/,/g) || []).length;
  return tabs > commas ? '\t' : ',';
}

export function parseCsvOrTsv(text) {
  return parseDelimited(text, detectDelimiter(text));
}
