import * as XLSX from 'xlsx';
import { indexToPosition, positionToIndex } from '../constants/palette';

const COLUMN_MAP = {
  CT: 'ct',
  Ct: 'ct',
  CQ: 'ct',
  Cq: 'ct',
  'C(T)': 'ct',
  'Sample Name': 'sampleName',
  Sample: 'sampleName',
  'Target Name': 'targetName',
  Target: 'targetName',
  Detector: 'targetName',
  Well: 'well',
  'Well Position': 'wellPosition',
  Task: 'task',
  'Task Name': 'task',
  'Amp Status': 'ampStatus',
  'Amplification Status': 'ampStatus',
  'Ct Threshold': 'ctThreshold',
  'CT Threshold': 'ctThreshold',
};

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

  if (Number.isNaN(normalized.ct)) normalized.ct = null;

  normalized.sampleName = String(normalized.sampleName ?? '').trim();
  normalized.targetName = String(normalized.targetName ?? '').trim();
  normalized.wellPosition = String(
    normalized.wellPosition || normalized.well || ''
  ).trim();
  normalized.task = String(normalized.task ?? '').trim();
  normalized.ampStatus = String(normalized.ampStatus ?? '').trim();
  normalized.ctThreshold =
    normalized.ctThreshold !== '' && normalized.ctThreshold !== undefined
      ? parseFloat(normalized.ctThreshold)
      : null;

  return normalized;
}

function parseResultsSheet(workbook) {
  const sheetName = workbook.SheetNames.find(
    (n) => /^results$/i.test(n.trim()) && !/^sheet1$/i.test(n.trim())
  );
  if (!sheetName) {
    throw new Error('Could not find a Results sheet in this Excel file.');
  }

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
    throw new Error('Could not find data table in the Results sheet.');
  }

  const headers = raw[headerIdx].map((h) => String(h).trim());

  return raw
    .slice(headerIdx + 1)
    .filter((row) => row.some((cell) => cell !== ''))
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] ?? '';
      });
      return normalizeRow(obj);
    });
}

function parseAmplificationData(workbook) {
  const sheetName = workbook.SheetNames.find((n) =>
    /^amplification\s*data$/i.test(n.trim())
  );
  if (!sheetName) return {};

  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const headerIdx = raw.findIndex((row) =>
    row.some((cell) => /well/i.test(String(cell)))
  );
  if (headerIdx === -1) return {};

  const headers = raw[headerIdx].map((h) => String(h).trim());
  const ampByKey = {};

  raw.slice(headerIdx + 1).forEach((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? '';
    });
    const well = String(obj['Well Position'] || obj.Well || '').trim();
    const target = String(obj['Target Name'] || obj.Target || '').trim();
    if (!well || !target) return;

    const rn = [];
    headers.forEach((h, i) => {
      const cycleMatch = h.match(/^cycle\s*(\d+)$/i);
      if (cycleMatch) {
        const val = parseFloat(row[i]);
        if (!Number.isNaN(val)) rn[parseInt(cycleMatch[1], 10) - 1] = val;
      }
    });

    if (rn.length) {
      ampByKey[`${well}||${target}`] = rn;
    }
  });

  return ampByKey;
}

export function parseXlsxFile(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const filteredSheets = workbook.SheetNames.filter(
    (n) => !/^sheet1$/i.test(n.trim())
  );
  if (!filteredSheets.length) {
    throw new Error('No valid sheets found in this Excel file.');
  }

  const rows = parseResultsSheet(workbook);
  const ampData = parseAmplificationData(workbook);

  const wellMap = {};
  for (let i = 0; i < 96; i++) {
    wellMap[i] = {
      index: i,
      position: indexToPosition(i),
      sampleName: '',
      targets: [],
      reactions: [],
    };
  }

  rows.forEach((row) => {
    const idx =
      positionToIndex(row.wellPosition) >= 0
        ? positionToIndex(row.wellPosition)
        : null;
    if (idx === null || idx < 0) return;

    const well = wellMap[idx];
    if (row.sampleName) well.sampleName = row.sampleName;
    if (row.targetName && !well.targets.includes(row.targetName)) {
      well.targets.push(row.targetName);
    }

    const rn = ampData[`${row.wellPosition}||${row.targetName}`] || [];
    well.reactions.push({
      targetName: row.targetName,
      task: row.task,
      quantity: null,
      cq: row.ct,
      cqConf: null,
      ctThreshold: row.ctThreshold,
      baselineStart: null,
      baselineEnd: null,
      ampScore: null,
      ampStatus: row.ampStatus || null,
      rn,
      deltaRn: [],
      flags: [],
      omitted: false,
    });
  });

  const wells = Object.values(wellMap).sort((a, b) => a.index - b.index);

  const targets = [
    ...new Set(wells.flatMap((w) => w.reactions.map((r) => r.targetName))),
  ]
    .filter(Boolean)
    .sort();

  const samples = [...new Set(wells.map((w) => w.sampleName).filter(Boolean))].sort();

  const cycleCount =
    wells.find((w) => w.reactions[0]?.rn?.length)?.reactions[0]?.rn?.length ?? 40;

  return {
    sourceType: 'xlsx',
    summary: { name: 'Excel Import' },
    plateSetup: { passiveReference: null, wells: [] },
    runMethod: null,
    runSummary: null,
    analysisSetting: null,
    standardCurveResult: null,
    wells,
    targets,
    samples,
    cycleCount,
    experimentName: 'Excel Import',
  };
}
