function fmt(n, digits = 4) {
  if (n == null || !Number.isFinite(n)) return '';
  return Number(n.toFixed(digits));
}

function escapeCsv(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowToCsv(row) {
  return row.map(escapeCsv).join(',');
}

/**
 * Export unified multi-gel dataset as CSV.
 * @param {Object} params
 * @param {Array} params.gelResults - { gelName, gelId, pairs, averagedRatio }
 * @param {string} params.strainName
 * @param {string} params.description
 */
export function exportGelQuantCsv({
  gelResults,
  strainName = '',
  description = '',
}) {
  const headers = [
    'Gel',
    'Lane',
    'Pair',
    'Target Label',
    'Control Label',
    'Target IntDen (raw)',
    'Control IntDen (raw)',
    'Target Corrected',
    'Control Corrected',
    'Ratio',
    'Target Mean',
    'Control Mean',
    'Target Inner ROI',
    'Target Outer ROI',
    'Control Inner ROI',
    'Control Outer ROI',
  ];

  const rows = [headers];

  for (const { gelName, pairs } of gelResults) {
    for (const p of pairs) {
      const fmtRoi = (roi) =>
        roi ? `${roi.x},${roi.y} ${roi.width}x${roi.height}` : '';
      rows.push([
        gelName,
        p.index,
        p.name,
        p.target?.displayName ?? '',
        p.control?.displayName ?? '',
        fmt(p.target?.measurements?.intDenInner, 2),
        fmt(p.control?.measurements?.intDenInner, 2),
        fmt(p.targetCorrected, 4),
        fmt(p.controlCorrected, 4),
        fmt(p.ratio, 6),
        fmt(p.target?.measurements?.meanInner, 4),
        fmt(p.control?.measurements?.meanInner, 4),
        fmtRoi(p.target?.innerROI),
        fmtRoi(p.target?.outerROI),
        fmtRoi(p.control?.innerROI),
        fmtRoi(p.control?.outerROI),
      ]);
    }
  }

  const meta = [
    [],
    ['# Metadata'],
    ['Strain', strainName],
    ['Description', description],
    ['Exported', new Date().toISOString()],
    ['Gels', gelResults.length],
  ];

  const csv = [...rows, ...meta].map(rowToCsv).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `gel_quantification_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
