import * as XLSX from 'xlsx';

const COLUMN_MAP = {
  CT: 'cq',
  Ct: 'cq',
  CQ: 'cq',
  Cq: 'cq',
  'C(T)': 'cq',
  'Sample Name': 'sampleName',
  Sample: 'sampleName',
  'Target Name': 'targetName',
  Target: 'targetName',
  Detector: 'targetName',
  Well: 'well',
  'Well Position': 'well',
  Task: 'task',
  'Task Name': 'task',
};

function parseAmplificationSheet(sheet) {
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const headerIdx = raw.findIndex((row) =>
    row.some((c) => /^cycle/i.test(String(c).trim()))
  );
  if (headerIdx === -1) return null;

  const headers = raw[headerIdx].map((h) => String(h).trim());
  const wellIdx = headers.findIndex((h) => /well/i.test(h));
  const cycleIdx = headers.findIndex((h) => /^cycle/i.test(h));
  const targetIdx = headers.findIndex((h) => /target/i.test(h));
  const rnIdx = headers.findIndex((h) => /^rn$/i.test(h));
  const dRnIdx = headers.findIndex((h) => /delta\s*rn/i.test(h));

  const curves = {};
  let cycleCount = 0;

  raw.slice(headerIdx + 1).forEach((row) => {
    if (row.every((c) => c === '')) return;
    const well = row[wellIdx];
    const target = row[targetIdx];
    const cycle = parseInt(row[cycleIdx], 10);
    const rn = parseFloat(row[rnIdx]);
    const dRn = parseFloat(row[dRnIdx]);
    const key = `${well}-${target}`;
    if (!curves[key]) curves[key] = { rn: [], deltaRn: [] };
    curves[key].rn[cycle - 1] = rn;
    curves[key].deltaRn[cycle - 1] = dRn;
    if (cycle > cycleCount) cycleCount = cycle;
  });

  return Object.keys(curves).length > 0 ? { cycleCount, curves } : null;
}

export function parseExcel(arrayBuffer, fileName) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const sheetName =
    workbook.SheetNames.find((n) => /result/i.test(n)) ||
    workbook.SheetNames.find((n) => n.toLowerCase() !== 'sheet1') ||
    workbook.SheetNames[0];

  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const headerIdx = raw.findIndex((row) =>
    row.some((cell) =>
      /^sample\s*name$/i.test(String(cell).trim()) ||
      /^well\s*position$/i.test(String(cell).trim()) ||
      /^well$/i.test(String(cell).trim())
    )
  );

  if (headerIdx === -1) {
    throw new Error(
      'Could not find a data table in this Excel file. Make sure you exported the "Results" sheet from QuantStudio.'
    );
  }

  const headers = raw[headerIdx].map((h) => String(h).trim());

  const replicates = raw
    .slice(headerIdx + 1)
    .filter((row) => row.some((cell) => cell !== ''))
    .map((row, i) => {
      const obj = {};
      headers.forEach((h, idx) => {
        const mapped = COLUMN_MAP[h] || h;
        obj[mapped] = row[idx] ?? '';
      });

      const rawCq = obj.cq;
      const cq =
        rawCq === '' || /undetermined/i.test(String(rawCq))
          ? null
          : parseFloat(rawCq);

      return {
        id: `row_${i}`,
        well: obj.well || null,
        sampleName: String(obj.sampleName || '').trim(),
        targetName: String(obj.targetName || '').trim(),
        cq: Number.isNaN(cq) ? null : cq,
        task: obj.task || null,
        isNTC: /ntc|no.?template/i.test(String(obj.task || obj.sampleName || '')),
      };
    })
    .filter((r) => r.sampleName && r.targetName);

  let ampCurves = null;
  const ampSheetName = workbook.SheetNames.find((n) => /amplification/i.test(n));
  if (ampSheetName) {
    ampCurves = parseAmplificationSheet(workbook.Sheets[ampSheetName]);
  }

  return {
    source: 'xlsx',
    fileName,
    replicates,
    runInfo: null,
    plateSetup: null,
    method: null,
    ampCurves,
  };
}
