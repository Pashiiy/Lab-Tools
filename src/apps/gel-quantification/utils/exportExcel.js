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
 * @param {Array} params.gelResults - { gelName, gelId, raw, pairs, averagedRatio }
 * @param {string} params.strainName
 * @param {string} params.description
 */
export async function exportGelQuantExcel({
  gelResults,
  strainName = '',
  description = '',
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Lab Tools — Gel Quantification';
  workbook.created = new Date();

  const allPairs = gelResults.flatMap((g) =>
    g.pairs.map((p) => ({ ...p, gelName: g.gelName }))
  );
  const completePairs = allPairs.filter((p) => p.complete);
  const sessionAvg =
    completePairs.length > 0
      ? completePairs.reduce((s, p) => s + (p.ratio ?? 0), 0) / completePairs.length
      : null;

  // —— Sheet 1: REPORT ——
  const report = workbook.addWorksheet('REPORT');
  report.getCell('A1').value = 'Gel Quantification Report';
  report.getCell('A1').font = { bold: true, size: 16 };
  report.getCell('A3').value = 'Generated';
  report.getCell('B3').value = new Date().toLocaleString();
  report.getCell('A4').value = 'Gels in dataset';
  report.getCell('B4').value = gelResults.length;
  report.getCell('A5').value = 'Complete pairs (all gels)';
  report.getCell('B5').value = completePairs.length;
  report.getCell('A6').value = 'Session averaged ratio';
  report.getCell('B6').value = fmt(sessionAvg, 4);

  report.getRow(8).values = [
    'Gel',
    'Lane',
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

  allPairs.forEach((p, i) => {
    const row = report.getRow(9 + i);
    row.values = [
      p.gelName,
      p.index,
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

  report.columns = Array(10).fill({ width: 16 });

  // —— Sheet 2: RAW DATA ——
  const rawSheet = workbook.addWorksheet('RAW DATA');
  rawSheet.getRow(1).values = [
    'Gel',
    'Lane',
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
  for (const gel of gelResults) {
    for (const p of gel.pairs) {
      for (const slot of [
        { roi: p.target, role: 'TARGET' },
        { roi: p.control, role: 'CONTROL' },
      ]) {
        if (!slot.roi) continue;
        const m = slot.roi.measurements || {};
        rawSheet.getRow(rawRow).values = [
          gel.gelName,
          p.index,
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
          gel.raw?.bitDepth ?? '—',
        ];
        rawRow += 1;
      }
    }
  }

  rawSheet.columns = Array(20).fill({ width: 12 });

  // —— Sheet 3: ANALYSIS ——
  const analysis = workbook.addWorksheet('ANALYSIS');
  analysis.getRow(1).values = [
    'Gel',
    'Lane',
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

  allPairs.forEach((p, i) => {
    analysis.getRow(2 + i).values = [
      p.gelName,
      p.index,
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

  analysis.columns = Array(12).fill({ width: 16 });

  // —— Sheet 4: IMAGES ——
  const images = workbook.addWorksheet('IMAGES');
  images.getCell('A1').value = 'Gel Images — ROI Reference';
  images.getCell('A1').font = { bold: true, size: 14 };

  let imageRow = 2;
  for (const gel of gelResults) {
    if (!gel.raw) continue;

    images.getCell(`A${imageRow}`).value = gel.gelName;
    images.getCell(`A${imageRow}`).font = { bold: true, size: 11 };
    imageRow += 1;

    const roiNote = gel.pairs
      .map((p) => {
        const lines = [];
        if (p.target?.innerROI) {
          lines.push(`${p.name} Target: (${p.target.innerROI.x},${p.target.innerROI.y})`);
        }
        if (p.control?.innerROI) {
          lines.push(`${p.name} Control: (${p.control.innerROI.x},${p.control.innerROI.y})`);
        }
        if (p.complete) lines.push(`Ratio: ${fmt(p.ratio, 4)}`);
        return lines.join(' | ');
      })
      .filter(Boolean)
      .join('\n');

    images.getCell(`A${imageRow}`).value = roiNote || 'No pairs';
    images.getCell(`A${imageRow}`).font = { size: 9, color: { argb: 'FF666666' } };
    imageRow += 1;

    try {
      const previewSrc = createDefaultDisplayDataUrl(gel.raw);
      const ext = previewSrc.includes('image/png') ? 'png' : 'jpeg';
      const imageId = workbook.addImage({
        base64: getBase64FromDataUrl(previewSrc),
        extension: ext,
      });

      const maxW = 420;
      const maxH = 300;
      const aspect = gel.raw.width / gel.raw.height;
      let w = maxW;
      let h = w / aspect;
      if (h > maxH) {
        h = maxH;
        w = h * aspect;
      }

      images.addImage(imageId, {
        tl: { col: 0, row: imageRow },
        ext: { width: w, height: h },
      });
      imageRow += Math.ceil(h / 18) + 2;
    } catch {
      images.getCell(`A${imageRow}`).value = '(image embed failed)';
      imageRow += 2;
    }
  }

  images.getColumn(1).width = 48;

  // —— Sheet 5: Metadata ——
  const metadata = workbook.addWorksheet('Metadata');
  metadata.getColumn(1).width = 22;
  metadata.getColumn(2).width = 48;

  const metaRows = [
    ['Strain Name', strainName?.trim() || ''],
    ['Description', description?.trim() || ''],
    ['Gel Count', gelResults.length],
    ['Export Date', new Date().toISOString()],
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
