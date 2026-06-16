import { excelBackground, excelCorrected, excelRatio } from './fijiExcelWorkflow.js';

/**
 * End-to-end parity report: Fiji (ground truth) vs Application.
 *
 * This module performs NO new math. It runs BOTH the Fiji-provided measurements
 * and the application's measured values through the IDENTICAL Excel workflow
 * (engine/fijiExcelWorkflow.js), then reports per-metric absolute and percent
 * error and localizes the FIRST pipeline stage where they diverge.
 *
 * A measurement set is: { innerArea, outerArea, innerMean, outerMean,
 * innerIntDen, outerIntDen }.
 */

/** Pipeline order — divergence is attributed to the FIRST metric that fails. */
export const METRIC_ORDER = [
  'innerArea',
  'outerArea',
  'innerMean',
  'outerMean',
  'innerIntDen',
  'outerIntDen',
  'background',
  'corrected',
];

export const METRIC_LABELS = {
  innerArea: 'Inner Area',
  outerArea: 'Outer Area',
  innerMean: 'Inner Mean',
  outerMean: 'Outer Mean',
  innerIntDen: 'Inner IntDen',
  outerIntDen: 'Outer IntDen',
  background: 'Background (Excel)',
  corrected: 'Corrected (Excel)',
  ratio: 'Ratio',
};

/**
 * Map a diverging metric to the single most likely pipeline stage. The mapping
 * is order-aware: e.g. if areas match but means differ, the cause is the
 * grayscale/pixel-value layer, not ROI geometry.
 */
export function stageForMetric(metric, metrics) {
  switch (metric) {
    case 'innerArea':
    case 'outerArea':
      return 'ROI coordinate handling / pixel counting (area = width × height)';
    case 'innerMean':
    case 'outerMean':
      return 'Grayscale conversion / pixel value extraction (mean per pixel)';
    case 'innerIntDen':
    case 'outerIntDen': {
      // If the matching area and mean both agree, IntDen should equal Area×Mean.
      // A remaining IntDen gap means Fiji applied spatial/density calibration.
      const side = metric === 'innerIntDen' ? 'inner' : 'outer';
      const areaOk = metrics?.[`${side}Area`]?.withinTolerance;
      const meanOk = metrics?.[`${side}Mean`]?.withinTolerance;
      if (areaOk && meanOk) {
        return 'IntDen calibration/scaling (Fiji image is calibrated; app uses raw RawIntDen = Σpixels)';
      }
      return 'IntDen calculation (driven by upstream area/mean mismatch)';
    }
    case 'background':
    case 'corrected':
    case 'ratio':
      return 'Excel formula layer (only reachable if all measurements already matched)';
    default:
      return 'Unknown';
  }
}

function compare(app, fiji, tolerancePct) {
  const appFinite = Number.isFinite(app);
  const fijiFinite = Number.isFinite(fiji);
  if (!appFinite || !fijiFinite) {
    return { app: appFinite ? app : null, fiji: fijiFinite ? fiji : null, abs: null, pct: null, withinTolerance: false, comparable: false };
  }
  const abs = app - fiji;
  const pct = fiji === 0 ? (abs === 0 ? 0 : null) : (abs / Math.abs(fiji)) * 100;
  const withinTolerance = pct == null ? abs === 0 : Math.abs(pct) <= tolerancePct;
  return { app, fiji, abs, pct, withinTolerance, comparable: true };
}

/**
 * Build a single-ROI parity report.
 *
 * @param {object} params
 * @param {object} params.fiji  Fiji-provided measurement set.
 * @param {object} params.app   Application-measured measurement set.
 * @param {number} [params.tolerancePct=1] pass/fail threshold per metric.
 */
export function buildParityReport({ fiji, app, tolerancePct = 1 }) {
  // Derived Excel values — SAME formula applied to each side independently.
  const fijiBackground = excelBackground({
    innerIntDen: fiji.innerIntDen,
    outerIntDen: fiji.outerIntDen,
    innerArea: fiji.innerArea,
    outerArea: fiji.outerArea,
  });
  const fijiCorrected = excelCorrected({
    innerIntDen: fiji.innerIntDen,
    outerIntDen: fiji.outerIntDen,
    innerArea: fiji.innerArea,
    outerArea: fiji.outerArea,
  });
  const appBackground = excelBackground({
    innerIntDen: app.innerIntDen,
    outerIntDen: app.outerIntDen,
    innerArea: app.innerArea,
    outerArea: app.outerArea,
  });
  const appCorrected = excelCorrected({
    innerIntDen: app.innerIntDen,
    outerIntDen: app.outerIntDen,
    innerArea: app.innerArea,
    outerArea: app.outerArea,
  });

  const metrics = {
    innerArea: compare(app.innerArea, fiji.innerArea, tolerancePct),
    outerArea: compare(app.outerArea, fiji.outerArea, tolerancePct),
    innerMean: compare(app.innerMean, fiji.innerMean, tolerancePct),
    outerMean: compare(app.outerMean, fiji.outerMean, tolerancePct),
    innerIntDen: compare(app.innerIntDen, fiji.innerIntDen, tolerancePct),
    outerIntDen: compare(app.outerIntDen, fiji.outerIntDen, tolerancePct),
    background: compare(appBackground, fijiBackground, tolerancePct),
    corrected: compare(appCorrected, fijiCorrected, tolerancePct),
  };

  // First diverging metric in pipeline order → single best-guess stage.
  let divergence = null;
  for (const metric of METRIC_ORDER) {
    const m = metrics[metric];
    if (m.comparable && !m.withinTolerance) {
      divergence = { metric, label: METRIC_LABELS[metric], pct: m.pct, abs: m.abs, stage: stageForMetric(metric, metrics) };
      break;
    }
  }

  const allWithinTolerance = METRIC_ORDER.every((k) => !metrics[k].comparable || metrics[k].withinTolerance);

  return {
    tolerancePct,
    fijiDerived: { background: fijiBackground, corrected: fijiCorrected },
    appDerived: { background: appBackground, corrected: appCorrected },
    metrics,
    divergence,
    allWithinTolerance,
  };
}

/**
 * Ratio parity from two single-ROI reports (A / B).
 */
export function buildRatioParity(reportA, reportB, tolerancePct = 1) {
  const fijiRatio = excelRatio(reportA.fijiDerived.corrected, reportB.fijiDerived.corrected);
  const appRatio = excelRatio(reportA.appDerived.corrected, reportB.appDerived.corrected);
  return {
    fiji: fijiRatio,
    app: appRatio,
    ...compare(appRatio, fijiRatio, tolerancePct),
  };
}

/** Plain-text structured report for copy/paste into a lab notebook or issue. */
export function formatReportText({ title, fiji, app, report, ratio }) {
  const lines = [];
  const f = (n, d = 4) => (n == null || !Number.isFinite(n) ? '—' : Number(n.toFixed(d)));
  lines.push(`=== Fiji ↔ App Parity Report${title ? `: ${title}` : ''} ===`);
  lines.push(`Tolerance: ≤${report.tolerancePct}% per metric`);
  lines.push('');
  lines.push('Metric          Fiji            App             AbsErr        %Err');
  for (const key of METRIC_ORDER) {
    const m = report.metrics[key];
    const label = METRIC_LABELS[key].padEnd(15);
    lines.push(
      `${label} ${String(f(m.fiji)).padEnd(15)} ${String(f(m.app)).padEnd(15)} ${String(f(m.abs)).padEnd(13)} ${m.pct == null ? '—' : `${f(m.pct, 4)}%`}`
    );
  }
  if (ratio) {
    lines.push(
      `${'Ratio'.padEnd(15)} ${String(f(ratio.fiji)).padEnd(15)} ${String(f(ratio.app)).padEnd(15)} ${String(f(ratio.abs)).padEnd(13)} ${ratio.pct == null ? '—' : `${f(ratio.pct, 4)}%`}`
    );
  }
  lines.push('');
  if (report.divergence) {
    lines.push(`Divergence point: ${report.divergence.label} (${report.divergence.pct == null ? 'n/a' : `${f(report.divergence.pct, 4)}%`})`);
    lines.push(`Likely stage: ${report.divergence.stage}`);
  } else {
    lines.push('Divergence point: none — all metrics within tolerance.');
  }
  return lines.join('\n');
}
