import ExcelJS from 'exceljs';
import { flagOutliers } from './flagOutliers';
import { buildProjectState } from './buildProjectState';

function toLightArgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const t = 0.82;
  return `FF${Math.round(r + (255 - r) * t)
    .toString(16)
    .padStart(2, '0')}${Math.round(g + (255 - g) * t)
    .toString(16)
    .padStart(2, '0')}${Math.round(b + (255 - b) * t)
    .toString(16)
    .padStart(2, '0')}`.toUpperCase();
}

function cellFill(argb) {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

const HEADER_FILL = cellFill('FF1A1A2E');
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
const HEADER_BORDER = { bottom: { style: 'medium', color: { argb: 'FF2DD4BF' } } };

function styleHeaderRow(row) {
  row.eachCell((cell) => {
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = HEADER_BORDER;
  });
  row.height = 22;
}

function titleRow(sheet, text, mergeRange) {
  sheet.mergeCells(mergeRange);
  const cell = sheet.getCell(mergeRange.split(':')[0]);
  cell.value = text;
  cell.font = { bold: true, size: 14, color: { argb: 'FFE6E6E6' } };
  return cell;
}

function subtitleRow(sheet, text, mergeRange) {
  sheet.mergeCells(mergeRange);
  const cell = sheet.getCell(mergeRange.split(':')[0]);
  cell.value = text;
  cell.font = { size: 10, color: { argb: 'FF8B949E' } };
  return cell;
}

function sectionTitle(sheet, text) {
  const row = sheet.addRow([text]);
  row.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF2DD4BF' } };
  return row;
}

function sampleColor(sampleColors, sampleName) {
  return sampleColors[sampleName] || '#888888';
}

function styleDataRow(row, color) {
  row.eachCell((cell) => {
    cell.fill = cellFill(toLightArgb(color));
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } } };
  });
}

function addOverviewSheet(workbook, { experiment, sampleColors }) {
  const overview = workbook.addWorksheet('Overview');

  titleRow(
    overview,
    `qPCR Analysis Export — ${experiment.runInfo?.experimentName || experiment.fileName}`,
    'A1:F1'
  );
  subtitleRow(
    overview,
    `Source: ${experiment.source === 'eds' ? 'QuantStudio .eds file' : 'Excel export'}  ·  Exported: ${new Date().toLocaleString()}`,
    'A2:F2'
  );
  overview.addRow([]);

  sectionTitle(overview, 'Experiment Summary');
  overview.addRow([
    'Targets',
    [...new Set(experiment.replicates.map((r) => r.targetName))].join(', '),
  ]);
  overview.addRow([
    'Samples',
    [...new Set(experiment.replicates.map((r) => r.sampleName))].length,
  ]);
  overview.addRow(['Total Replicates', experiment.replicates.length]);
  overview.addRow([]);

  if (experiment.runInfo) {
    sectionTitle(overview, 'Run Information');
    const ri = experiment.runInfo;
    overview.addRow(['Instrument', ri.instrumentType]);
    overview.addRow(['Serial Number', ri.serialNumber ?? '—']);
    overview.addRow(['Firmware', ri.firmwareVersion ?? '—']);
    overview.addRow(['Status', ri.status ?? '—']);
    overview.addRow([
      'Start Time',
      ri.startTime ? new Date(ri.startTime).toLocaleString() : '—',
    ]);
    overview.addRow([
      'End Time',
      ri.endTime ? new Date(ri.endTime).toLocaleString() : '—',
    ]);
    if (ri.startTime && ri.endTime) {
      const durationMs = ri.endTime - ri.startTime;
      const h = Math.floor(durationMs / 3600000);
      const m = Math.floor((durationMs % 3600000) / 60000);
      overview.addRow(['Duration', `${h}h ${m}m`]);
    }
    overview.addRow(['Run Mode', ri.runMode ?? '—']);
    overview.addRow(['Passive Reference', ri.passiveReference ?? '—']);
    overview.addRow([]);
  }

  if (experiment.plateSetup?.wells?.length) {
    sectionTitle(overview, 'Plate Setup');

    const colHeaderRow = overview.addRow([
      '',
      ...Array.from({ length: 12 }, (_, i) => i + 1),
    ]);
    colHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FF8B949E' } };
      cell.alignment = { horizontal: 'center' };
    });

    for (let r = 0; r < 8; r++) {
      const rowLabel = String.fromCharCode(65 + r);
      const rowCells = [rowLabel];
      for (let c = 1; c <= 12; c++) {
        const well = experiment.plateSetup.wells.find((w) => w.position === `${rowLabel}${c}`);
        rowCells.push(well?.sampleName || '');
      }
      const row = overview.addRow(rowCells);
      row.getCell(1).font = { bold: true, color: { argb: 'FF8B949E' } };
      row.eachCell((cell, col) => {
        if (col > 1 && cell.value) {
          cell.fill = cellFill(toLightArgb(sampleColor(sampleColors, cell.value)));
          cell.alignment = { horizontal: 'center' };
          cell.font = { size: 9 };
        }
      });
    }
    overview.addRow([]);
  }

  if (experiment.method?.stages?.length) {
    sectionTitle(overview, 'Method');
    overview.addRow(['Sample Volume (µL)', experiment.method.sampleVolume ?? '—']);
    overview.addRow(['Cover Temperature (°C)', experiment.method.coverTemperature ?? '—']);
    overview.addRow([]);

    const stageHeaderRow = overview.addRow([
      'Stage',
      'Repeats',
      'Step',
      'Temp (°C)',
      'Duration (s)',
      'Collects Data?',
    ]);
    styleHeaderRow(stageHeaderRow);

    experiment.method.stages.forEach((stage) => {
      (stage.steps || []).forEach((step, i) => {
        overview.addRow([
          i === 0 ? stage.type : '',
          i === 0 ? stage.repeatCount : '',
          i + 1,
          step.temperature ?? '—',
          step.duration ?? '—',
          step.collection ? 'Yes' : 'No',
        ]);
      });
    });
    overview.addRow([]);
  }

  overview.columns = [
    { width: 22 },
    { width: 14 },
    { width: 12 },
    { width: 12 },
    { width: 14 },
    { width: 14 },
    ...Array.from({ length: 7 }, () => ({ width: 8 })),
  ];
}

function addRawDataSheet(workbook, { experiment, sampleColors }) {
  const rawSheet = workbook.addWorksheet('Raw Data');
  titleRow(rawSheet, 'Raw Data — All Replicates', 'A1:F1');
  rawSheet.addRow([]);

  const headers = ['Well', 'Sample', 'Target', 'Cq', 'Task', 'Flags'];
  const headerRow = rawSheet.addRow(headers);
  styleHeaderRow(headerRow);
  rawSheet.columns = [
    { width: 8 },
    { width: 18 },
    { width: 14 },
    { width: 12 },
    { width: 14 },
    { width: 22 },
  ];

  const outlierIds = flagOutliers(experiment.replicates);

  experiment.replicates.forEach((r) => {
    const color = sampleColor(sampleColors, r.sampleName);
    const flags = [];
    if (r.isNTC) flags.push('NTC');
    if (r.cq === null) flags.push('UNDETERMINED');
    if (outlierIds.has(r.id)) flags.push('OUTLIER');

    const row = rawSheet.addRow([
      r.well || '—',
      r.sampleName,
      r.targetName,
      r.cq !== null ? r.cq : 'Undetermined',
      r.task || '—',
      flags.join(', '),
    ]);

    styleDataRow(row, color);
    if (r.cq === null) row.getCell(4).font = { color: { argb: 'FFF87171' }, italic: true };
    if (flags.length) row.getCell(6).font = { color: { argb: 'FFFBBF24' }, size: 10 };
  });

  rawSheet.views = [{ state: 'frozen', ySplit: 3 }];
}

function addAveragedSheet(workbook, { averagedData, sampleColors }) {
  const avgSheet = workbook.addWorksheet('Averaged');
  titleRow(avgSheet, 'Averaged — Mean Cq per Sample/Target', 'A1:G1');
  avgSheet.addRow([]);

  const avgHeaders = ['Sample', 'Target', 'n', 'Mean Cq', 'SD', 'CV%', 'Flags'];
  const avgHeaderRow = avgSheet.addRow(avgHeaders);
  styleHeaderRow(avgHeaderRow);
  avgSheet.columns = [
    { width: 18 },
    { width: 14 },
    { width: 6 },
    { width: 12 },
    { width: 10 },
    { width: 8 },
    { width: 16 },
  ];

  averagedData.forEach((g) => {
    const color = sampleColor(sampleColors, g.sampleName);
    const flags = [];
    if (g.cv !== null && g.cv > 5) flags.push('HIGH CV');
    if (g.meanCq === null) flags.push('ALL UNDET');

    const row = avgSheet.addRow([
      g.sampleName,
      g.targetName,
      g.n,
      g.meanCq ?? 'Undetermined',
      g.sd ?? '—',
      g.cv ?? '—',
      flags.join(', '),
    ]);
    styleDataRow(row, color);
    if (g.cv !== null && g.cv > 5) row.getCell(6).fill = cellFill('FFFBBF24');
  });

  avgSheet.views = [{ state: 'frozen', ySplit: 3 }];
}

function addDDCtSheet(
  workbook,
  { averagedData, ddCtResults, sampleColors, referenceGene, calibratorSample }
) {
  const ddctSheet = workbook.addWorksheet('ΔΔCt');
  titleRow(ddctSheet, 'ΔΔCt Analysis', 'A1:H1');

  const configText = calibratorSample
    ? `Reference gene: ${referenceGene}  ·  Calibrator: ${calibratorSample}`
    : `Reference gene: ${referenceGene}  ·  No calibrator selected (RQ shown relative to each sample's own ${referenceGene})`;
  subtitleRow(ddctSheet, configText, 'A2:H2');
  ddctSheet.addRow([]);

  const hasFoldChange = !!calibratorSample;
  const ddctHeaders = ['Sample', 'Target', 'Mean Cq', 'ΔCt', 'RQ', '±RQ Error'];
  if (hasFoldChange) ddctHeaders.push('ΔΔCt', 'Fold Change', '±FC Error');
  ddctHeaders.push('Flags');

  const ddctHeaderRow = ddctSheet.addRow(ddctHeaders);
  styleHeaderRow(ddctHeaderRow);
  ddctSheet.columns = ddctHeaders.map(() => ({ width: 14 }));
  ddctSheet.getColumn(1).width = 18;
  ddctSheet.getColumn(ddctHeaders.length).width = 18;

  ddCtResults.forEach((r) => {
    const color = sampleColor(sampleColors, r.sample);
    const meanCq = averagedData.find(
      (a) => a.sampleName === r.sample && a.targetName === r.target
    )?.meanCq;

    const rowData = [
      r.sample,
      r.target,
      meanCq ?? '—',
      r.deltaCt ?? '—',
      r.rq ?? '—',
      r.rqErrorPlus !== null ? `±${r.rqErrorPlus}` : '—',
    ];
    if (hasFoldChange) {
      rowData.push(
        r.ddCt ?? '—',
        r.isCalibrator ? '1.0000 (calibrator)' : (r.foldChange ?? '—'),
        r.errorPlus !== null ? `±${r.errorPlus}` : '—'
      );
    }
    rowData.push(r.warning || '');

    const row = ddctSheet.addRow(rowData);
    styleDataRow(row, color);
    row.getCell(5).font = { bold: true };

    if (hasFoldChange && r.foldChange !== null) {
      const fcCell = row.getCell(8);
      if (r.foldChange > 1) fcCell.fill = cellFill('FF60A5FA');
      else if (r.foldChange < 1) fcCell.fill = cellFill('FFFB923C');
      if (r.foldChange > 1 || r.foldChange < 1) {
        fcCell.font = { bold: true, color: { argb: 'FF111111' } };
      }
    }
    if (r.warning) {
      row.getCell(ddctHeaders.length).font = {
        color: { argb: 'FFFBBF24' },
        size: 9,
        italic: true,
      };
    }
  });

  ddctSheet.views = [{ state: 'frozen', ySplit: 4 }];
}

function addTimeCourseSheet(
  workbook,
  {
    normalizedData,
    ratioData,
    sampleColors,
    t0Timepoint,
    timeUnit,
    ratioTargetA,
    ratioTargetB,
  }
) {
  const tcSheet = workbook.addWorksheet('Time Course');
  titleRow(tcSheet, 'Time Course — Normalized to T0', 'A1:H1');
  subtitleRow(
    tcSheet,
    `T0 = ${t0Timepoint}${timeUnit}  ·  Each target+dilution normalized independently`,
    'A2:H2'
  );
  tcSheet.addRow([]);

  const tcHeaders = [
    'Timepoint',
    'Dilution',
    'Target',
    'Sample',
    'RQ',
    '% of T0',
    'Fold vs T0',
    '±Error (%)',
  ];
  const tcHeaderRow = tcSheet.addRow(tcHeaders);
  styleHeaderRow(tcHeaderRow);
  tcSheet.columns = tcHeaders.map(() => ({ width: 14 }));
  tcSheet.getColumn(4).width = 18;

  normalizedData.forEach((d) => {
    const color = sampleColor(sampleColors, d.sampleName);
    const row = tcSheet.addRow([
      `${d.timepoint}${timeUnit}`,
      `1:${d.dilution}`,
      d.target,
      d.sampleName,
      d.rq,
      d.normalizedPercent !== null ? `${d.normalizedPercent}%` : '—',
      d.foldVsT0 ?? '—',
      d.normErrPlus !== null ? `±${d.normErrPlus.toFixed(1)}%` : '—',
    ]);
    styleDataRow(row, color);
    row.getCell(6).font = { bold: true };
    if (d.timepoint === t0Timepoint) {
      row.getCell(6).fill = cellFill('FF2DD4BF');
      row.getCell(6).font = { bold: true, color: { argb: 'FF111111' } };
    }
  });

  tcSheet.addRow([]);

  if (ratioData?.length > 0 && ratioTargetA && ratioTargetB) {
    sectionTitle(tcSheet, `${ratioTargetA}:${ratioTargetB} Ratio`);
    const ratioHeaderRow = tcSheet.addRow(['Timepoint', 'Dilution', 'Ratio']);
    styleHeaderRow(ratioHeaderRow);
    ratioData.forEach((r) => {
      tcSheet.addRow([`${r.timepoint}${timeUnit}`, `1:${r.dilution}`, r.ratio ?? '—']);
    });
  }

  tcSheet.views = [{ state: 'frozen', ySplit: 4 }];
}

function addStandardCurveSheet(workbook, { standardCurves }) {
  const scSheet = workbook.addWorksheet('Standard Curve');
  titleRow(scSheet, 'Standard Curve — Primer Efficiency', 'A1:G1');
  scSheet.addRow([]);

  const scHeaders = ['Target', 'Series', 'Slope', 'Intercept', 'R²', 'Efficiency (%)', 'Quality'];
  const scHeaderRow = scSheet.addRow(scHeaders);
  styleHeaderRow(scHeaderRow);
  scSheet.columns = scHeaders.map(() => ({ width: 14 }));

  const qualityColors = {
    Good: 'FF4ADE80',
    Acceptable: 'FFFBBF24',
    Poor: 'FFF87171',
    Unknown: 'FF8B949E',
  };

  standardCurves.forEach((curve) => {
    const row = scSheet.addRow([
      curve.target,
      curve.seriesLabel,
      curve.slope,
      curve.intercept,
      curve.r2,
      curve.efficiency,
      curve.quality,
    ]);
    row.eachCell((cell) => {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } } };
    });
    row.getCell(7).fill = cellFill(qualityColors[curve.quality] || qualityColors.Unknown);
    row.getCell(7).font = { bold: true, color: { argb: 'FF111111' } };
  });

  scSheet.addRow([]);

  standardCurves.forEach((curve) => {
    sectionTitle(
      scSheet,
      `${curve.target} (${curve.seriesLabel}) — Regression Points`
    );
    const ptsHeaderRow = scSheet.addRow([
      'Sample',
      'Dilution',
      'log₁₀(Qty)',
      'Mean Cq',
      'Predicted Cq',
      'Residual',
    ]);
    styleHeaderRow(ptsHeaderRow);
    curve.points.forEach((p) => {
      const predicted = curve.slope * p.logQuantity + curve.intercept;
      const residual = p.meanCq - predicted;
      scSheet.addRow([
        p.sampleName,
        `1:${p.dilutionDenominator}`,
        p.logQuantity.toFixed(3),
        p.meanCq.toFixed(3),
        predicted.toFixed(3),
        residual.toFixed(3),
      ]);
    });
    scSheet.addRow([]);
  });
}

function addAppStateSheet(workbook, projectState) {
  const stateSheet = workbook.addWorksheet('_AppState', { state: 'veryHidden' });
  stateSheet.getCell('A1').value = 'qPCR Analysis Project Data — Do not edit this sheet';
  stateSheet.getCell('A1').font = { bold: true, color: { argb: 'FF8B949E' }, size: 10 };
  stateSheet.getCell('A2').value = JSON.stringify(projectState);
  stateSheet.getColumn(1).width = 80;
}

export async function exportQPCRInsightExcel({
  experiment,
  averagedData,
  ddCtResults,
  standardCurves,
  sampleColors,
  referenceGene,
  calibratorSample,
  timeCourseExport,
  projectStateExtras,
}) {
  const workbook = new ExcelJS.Workbook();
  const omittedNotes = [];

  addOverviewSheet(workbook, { experiment, sampleColors });

  addRawDataSheet(workbook, { experiment, sampleColors });
  addAveragedSheet(workbook, { averagedData, sampleColors });

  if (referenceGene && ddCtResults?.length) {
    addDDCtSheet(workbook, {
      averagedData,
      ddCtResults,
      sampleColors,
      referenceGene,
      calibratorSample,
    });
  } else {
    omittedNotes.push(
      'ΔΔCt analysis was not configured for this export — open the file in qPCR Analysis and select a reference gene to add this sheet.'
    );
  }

  if (timeCourseExport?.normalizedData?.length) {
    addTimeCourseSheet(workbook, timeCourseExport);
  } else if (timeCourseExport?.skipped) {
    omittedNotes.push(
      'Time Course data was not available — select a reference gene in the ΔΔCt tab and ensure sample names include a time point prefix (e.g. "0 1:100", "24 1:100").'
    );
  }

  if (standardCurves?.length) {
    addStandardCurveSheet(workbook, { standardCurves });
  } else {
    omittedNotes.push(
      'Standard Curve analysis was not detected — sample names must include dilution series (e.g. "1:10", "1:100") with 2+ points per target.'
    );
  }

  if (omittedNotes.length) {
    const overview = workbook.getWorksheet('Overview');
    sectionTitle(overview, 'Analysis Notes');
    omittedNotes.forEach((note) => {
      const row = overview.addRow([note]);
      row.getCell(1).font = { italic: true, color: { argb: 'FF8B949E' }, size: 10 };
    });
  }

  const projectState = buildProjectState({
    experiment,
    referenceGene,
    calibratorSample,
    timeCourseExport,
    ...(projectStateExtras || {}),
  });
  addAppStateSheet(workbook, projectState);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${experiment.fileName.replace(/\.[^.]+$/, '')}_analysis.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

/** @deprecated Use exportQPCRInsightExcel */
export const exportToExcel = exportQPCRInsightExcel;
