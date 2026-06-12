import ExcelJS from 'exceljs';

function toArgb(hex) {
  return `FF${hex.replace('#', '').toUpperCase()}`;
}

function toLightArgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const t = 0.82;
  const lr = Math.round(r + (255 - r) * t);
  const lg = Math.round(g + (255 - g) * t);
  const lb = Math.round(b + (255 - b) * t);
  return `FF${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`.toUpperCase();
}

function cellFill(argb) {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function styleHeaderRow(row) {
  row.font = { bold: true, color: { argb: 'FFE6EDF3' }, size: 10 };
  row.fill = cellFill('FF21262D');
  row.eachCell((cell) => {
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF58A6FF' } },
    };
  });
}

export async function exportQPCRExcel({
  rawData,
  rawHeaders,
  averagedData,
  ddCtResults,
  sampleColors,
  referenceGene,
  controlSample,
  fileName,
}) {
  const wb = new ExcelJS.Workbook();

  const rawSheet = wb.addWorksheet('Raw Data');
  const headers = rawHeaders?.length
    ? rawHeaders
    : ['Well Position', 'Sample Name', 'Target Name', 'CT', 'Amp Status'];

  rawSheet.addRow(headers);
  styleHeaderRow(rawSheet.getRow(1));
  rawSheet.views = [{ state: 'frozen', ySplit: 1 }];

  rawData.forEach((row) => {
    const original = row._original ?? row;
    const values = headers.map((h) => original[h] ?? '');
    const excelRow = rawSheet.addRow(values);
    const color = sampleColors[row.sampleName];
    if (color) {
      excelRow.eachCell((cell) => {
        cell.fill = cellFill(toLightArgb(color));
      });
    }
    const ctIdx = headers.findIndex((h) => /^c[tq]$/i.test(h.trim()));
    if (ctIdx >= 0) {
      const ctCell = excelRow.getCell(ctIdx + 1);
      const val = String(ctCell.value ?? '');
      if (/undetermined/i.test(val) || val === '') {
        ctCell.font = { color: { argb: 'FFF85149' } };
      }
    }
  });

  const avgSheet = wb.addWorksheet('Averaged');
  const avgHeaders = ['Sample', 'Target', 'n', 'Mean CT', 'SD', 'CV%'];
  avgSheet.addRow(avgHeaders);
  styleHeaderRow(avgSheet.getRow(1));
  avgSheet.views = [{ state: 'frozen', ySplit: 1 }];

  averagedData.forEach((row) => {
    const excelRow = avgSheet.addRow([
      row.sampleName,
      row.targetName,
      row.n,
      row.meanCt ?? '—',
      row.sd ?? '—',
      row.cv !== null ? `${row.cv}%` : '—',
    ]);
    const color = sampleColors[row.sampleName];
    if (color) {
      excelRow.eachCell((cell) => {
        cell.fill = cellFill(toLightArgb(color));
      });
    }
    if (row.cv !== null && row.cv > 5) {
      const cvCell = excelRow.getCell(6);
      cvCell.fill = cellFill('FFD29922');
      cvCell.font = { color: { argb: 'FF0D1117' } };
    }
  });

  if (ddCtResults?.length && referenceGene && controlSample) {
    const ddSheet = wb.addWorksheet('ΔΔCt Results');
    ddSheet.mergeCells('A1:G1');
    const noteCell = ddSheet.getCell('A1');
    noteCell.value = `Reference gene: ${referenceGene}  |  Control sample: ${controlSample}`;
    noteCell.font = { italic: true, color: { argb: 'FF8B949E' }, size: 10 };

    const ddHeaders = [
      'Sample',
      'Target',
      'ΔCt',
      'ΔΔCt',
      'Fold Change',
      'Error+',
      'Error−',
    ];
    ddSheet.addRow(ddHeaders);
    styleHeaderRow(ddSheet.getRow(2));
    ddSheet.views = [{ state: 'frozen', ySplit: 2 }];

    ddCtResults.forEach((row) => {
      const excelRow = ddSheet.addRow([
        row.sample,
        row.target,
        row.deltaCt ?? '—',
        row.ddCt ?? '—',
        row.foldChange ?? '—',
        row.errorPlus ?? '—',
        row.errorMinus ?? '—',
      ]);
      const color = sampleColors[row.sample];
      if (color) {
        excelRow.getCell(1).fill = cellFill(toLightArgb(color));
      }
      const fcCell = excelRow.getCell(5);
      if (row.foldChange === 1) {
        fcCell.fill = cellFill('FF333344');
      } else if (row.foldChange > 1) {
        fcCell.fill = cellFill('FF1A3A5C');
        fcCell.font = { color: { argb: 'FF58A6FF' } };
      } else if (row.foldChange !== null && row.foldChange < 1) {
        fcCell.fill = cellFill('FF4A2A1A');
        fcCell.font = { color: { argb: 'FFD29922' } };
      }
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(fileName?.replace(/\.[^.]+$/, '') || 'qpcr')}_analyzed.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
