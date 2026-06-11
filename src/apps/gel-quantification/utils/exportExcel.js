import ExcelJS from 'exceljs';
import { createDefaultDisplayDataUrl } from '../../../shared/image/displayRenderer';

function cellFill(argb) {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function styleHeaderRow(row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = cellFill('FF1A3A2E');
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { bottom: { style: 'medium', color: { argb: 'FF2E8B57' } } };
  });
}

function getBase64FromDataUrl(src) {
  return src.replace(/^data:image\/\w+;base64,/, '');
}

function fmt(n, digits = 4) {
  if (n == null || !Number.isFinite(n)) return '—';
  return Number(n.toFixed(digits));
}

/**
 * @param {Object} params
 * @param {import('../../../shared/image/rawImageStore').RawImageStore|null} params.raw
 * @param {Array} params.pairs - enriched pairs
 * @param {number|null} params.averagedRatio
 * @param {string} params.strainName - session-level strain
 * @param {string} params.description - session-level description
 */
export async function exportGelQuantExcel({
  raw,
  pairs,
  averagedRatio,
  strainName = '',
  description = '',
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Lab Tools — Gel Quantification';
  workbook.created = new Date();

  const completePairs = pairs.filter((p) => p.complete);

  // —— Sheet 1: REPORT ——
  const report = workbook.addWorksheet('REPORT');
  report.getCell('A1').value = 'Gel Quantification Report';
  report.getCell('A1').font = { bold: true, size: 16 };
  report.getCell('A3').value = 'Generated';
  report.getCell('B3').value = new Date().toLocaleString();
  report.getCell('A4').value = 'Gel image';
  report.getCell('B4').value = raw?.name ?? '—';
  report.getCell('A5').value = 'Complete pairs';
  report.getCell('B5').value = completePairs.length;
  report.getCell('A6').value = 'Averaged ratio';
  report.getCell('B6').value = fmt(averagedRatio, 4);

  report.getRow(8).values = [
    'Pair',
    'Target Label',
    'Control Label',
    'Target Corrected',
    'Control Corrected',
    'Ratio (T/C)',
    'Target IntDen',
    'Control IntDen',
  ];
  styleHeaderRow(report.getRow(8));

  pairs.forEach((p, i) => {
    const row = report.getRow(9 + i);
    row.values = [
      p.name,
      p.target?.displayName ?? '—',
      p.control?.displayName ?? '—',
      fmt(p.targetCorrected, 2),
      fmt(p.controlCorrected, 2),
      fmt(p.ratio, 4),
      fmt(p.target?.measurements?.intDenInner, 2),
      fmt(p.control?.measurements?.intDenInner, 2),
    ];
  });

  report.columns = Array(8).fill({ width: 18 });

  // —— Sheet 2: RAW DATA ——
  const rawSheet = workbook.addWorksheet('RAW DATA');
  rawSheet.getRow(1).values = [
    'Pair',
    'Role',
    'Label',
    'Inner X',
    'Inner Y',
    'Inner W',
    'Inner H',
    'Outer X',
    'Outer Y',
    'Outer W',
    'Outer H',
    'Area Inner',
    'Area Outer',
    'Mean Inner',
    'IntDen Inner',
    'IntDen Outer',
    'Corrected',
    'Bit Depth',
  ];
  styleHeaderRow(rawSheet.getRow(1));

  let rawRow = 2;
  for (const p of pairs) {
    for (const slot of [
      { roi: p.target, role: 'TARGET' },
      { roi: p.control, role: 'CONTROL' },
    ]) {
      if (!slot.roi) continue;
      const m = slot.roi.measurements || {};
      rawSheet.getRow(rawRow).values = [
        p.name,
        slot.role,
        slot.roi.displayName,
        slot.roi.innerROI?.x ?? '—',
        slot.roi.innerROI?.y ?? '—',
        slot.roi.innerROI?.width ?? '—',
        slot.roi.innerROI?.height ?? '—',
        slot.roi.outerROI?.x ?? '—',
        slot.roi.outerROI?.y ?? '—',
        slot.roi.outerROI?.width ?? '—',
        slot.roi.outerROI?.height ?? '—',
        m.areaInner ?? '—',
        m.areaOuter ?? '—',
        fmt(m.meanInner, 4),
        fmt(m.intDenInner, 2),
        fmt(m.intDenOuter, 2),
        fmt(m.correctedIntensity, 4),
        raw?.bitDepth ?? '—',
      ];
      rawRow += 1;
    }
  }

  rawSheet.columns = Array(18).fill({ width: 14 });

  // —— Sheet 3: ANALYSIS ——
  const analysis = workbook.addWorksheet('ANALYSIS');
  analysis.getRow(1).values = [
    'Pair',
    'Target Label',
    'Control Label',
    'Target Corrected',
    'Control Corrected',
    'Ratio',
    'Target Mean',
    'Control Mean',
    'Target Area',
    'Control Area',
  ];
  styleHeaderRow(analysis.getRow(1));

  pairs.forEach((p, i) => {
    analysis.getRow(2 + i).values = [
      p.name,
      p.target?.displayName ?? '—',
      p.control?.displayName ?? '—',
      fmt(p.targetCorrected, 4),
      fmt(p.controlCorrected, 4),
      fmt(p.ratio, 6),
      fmt(p.target?.measurements?.meanInner, 4),
      fmt(p.control?.measurements?.meanInner, 4),
      p.target?.measurements?.areaInner ?? '—',
      p.control?.measurements?.areaInner ?? '—',
    ];
  });

  if (averagedRatio != null) {
    const avgRow = analysis.getRow(2 + pairs.length + 1);
    avgRow.getCell(1).value = 'AVERAGED RATIO';
    avgRow.getCell(1).font = { bold: true };
    avgRow.getCell(6).value = fmt(averagedRatio, 6);
  }

  analysis.columns = Array(10).fill({ width: 18 });

  // —— Sheet 4: IMAGES ——
  const images = workbook.addWorksheet('IMAGES');
  images.getCell('A1').value = 'Gel Image with ROI Reference';
  images.getCell('A1').font = { bold: true, size: 14 };

  if (raw) {
    const previewSrc = createDefaultDisplayDataUrl(raw);
    images.getCell('A3').value = raw.name;
    images.getCell('A3').font = { bold: true, size: 11 };

    const roiNote = pairs
      .map((p) => {
        const lines = [];
        if (p.target?.innerROI) {
          lines.push(
            `${p.name} Target: (${p.target.innerROI.x},${p.target.innerROI.y})`
          );
        }
        if (p.control?.innerROI) {
          lines.push(
            `${p.name} Control: (${p.control.innerROI.x},${p.control.innerROI.y})`
          );
        }
        if (p.complete) lines.push(`Ratio: ${fmt(p.ratio, 4)}`);
        return lines.join(' | ');
      })
      .filter(Boolean)
      .join('\n');

    images.getCell('A4').value = roiNote || 'No pairs';
    images.getCell('A4').font = { size: 9, color: { argb: 'FF666666' } };

    try {
      const ext = previewSrc.includes('image/png') ? 'png' : 'jpeg';
      const imageId = workbook.addImage({
        base64: getBase64FromDataUrl(previewSrc),
        extension: ext,
      });

      const maxW = 480;
      const maxH = 360;
      const aspect = raw.width / raw.height;
      let w = maxW;
      let h = w / aspect;
      if (h > maxH) {
        h = maxH;
        w = h * aspect;
      }

      images.addImage(imageId, {
        tl: { col: 0, row: 4 },
        ext: { width: w, height: h },
      });
    } catch {
      images.getCell('A6').value = '(image embed failed)';
    }
  }

  images.getColumn(1).width = 48;

  // —— Sheet 5: Metadata (session-level fields) ——
  const metadata = workbook.addWorksheet('Metadata');
  metadata.getColumn(1).width = 22;
  metadata.getColumn(2).width = 48;

  const metaRows = [
    ['Strain Name', strainName?.trim() || ''],
    ['Description', description?.trim() || ''],
  ];

  metaRows.forEach(([label, value], i) => {
    const row = metadata.getRow(1 + i);
    row.getCell(1).value = label;
    row.getCell(1).font = { bold: true };
    row.getCell(2).value = value;
    if (label === 'Description') {
      row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `gel_quantification_${new Date().toISOString().slice(0, 10)}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
