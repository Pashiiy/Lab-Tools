import { useMemo, useState } from 'react';
import {
  buildParityReport,
  buildRatioParity,
  formatReportText,
  METRIC_LABELS,
} from '../engine/parityReport';

/**
 * Parity Audit — end-to-end Fiji ↔ App verification for a real session ROI.
 *
 * The "App" column is the application's actual measurement of the selected ROI
 * (raw pixel area / mean / IntDen). The "Fiji" column is what you type from
 * ImageJ's Measure window. Both are run through the identical Excel workflow and
 * compared, and the first diverging pipeline stage is identified. No math is
 * performed here beyond the existing engine — this is verification only.
 */

const FIELDS = [
  ['innerArea', 'Inner Area'],
  ['outerArea', 'Outer Area'],
  ['innerMean', 'Inner Mean'],
  ['outerMean', 'Outer Mean'],
  ['innerIntDen', 'Inner IntDen'],
  ['outerIntDen', 'Outer IntDen'],
];

const EMPTY = {
  innerArea: '', outerArea: '', innerMean: '', outerMean: '', innerIntDen: '', outerIntDen: '',
};

function num(v) {
  if (v === '' || v == null) return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function fmt(n, d = 4) {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: d });
}

function appFromRoi(roi) {
  const m = roi?.measurements;
  if (!m) return null;
  return {
    innerArea: m.areaInner,
    outerArea: m.areaOuter,
    innerMean: m.meanInner,
    outerMean: m.meanOuter,
    innerIntDen: m.intDenInner,
    outerIntDen: m.intDenOuter,
  };
}

function fijiFrom(state) {
  return {
    innerArea: num(state.innerArea),
    outerArea: num(state.outerArea),
    innerMean: num(state.innerMean),
    outerMean: num(state.outerMean),
    innerIntDen: num(state.innerIntDen),
    outerIntDen: num(state.outerIntDen),
  };
}

function statusClass(metric) {
  if (!metric || !metric.comparable) return '';
  return metric.withinTolerance ? 'gq-validator__row--match' : 'gq-validator__row--mismatch';
}

function MetricRow({ label, metric, digits = 4 }) {
  return (
    <tr className={statusClass(metric)}>
      <td>{label}</td>
      <td>{fmt(metric?.fiji, digits)}</td>
      <td>{fmt(metric?.app, digits)}</td>
      <td>{metric?.abs == null ? '—' : fmt(metric.abs, 6)}</td>
      <td>{metric?.pct == null ? '—' : `${fmt(metric.pct, 5)}%`}</td>
    </tr>
  );
}

function RoiPanel({ tag, rois, roiId, setRoiId, fiji, setFiji, report, parityMode }) {
  const roi = rois.find((r) => r.id === roiId) ?? null;
  const app = appFromRoi(roi);

  const fillFromApp = () => {
    if (!app) return;
    setFiji({
      innerArea: String(app.innerArea),
      outerArea: String(app.outerArea),
      innerMean: String(app.innerMean),
      outerMean: String(app.outerMean),
      innerIntDen: String(app.innerIntDen),
      outerIntDen: String(app.outerIntDen),
    });
  };

  const m = roi?.measurements;
  const areaIdentity = m ? m.areaInner === (roi.innerROI?.width ?? 0) * (roi.innerROI?.height ?? 0) : false;
  const intDenIdentity = m ? m.intDenIdentityInner && m.intDenIdentityOuter : false;

  return (
    <div className="gq-parity__panel">
      <div className="gq-parity__panel-head">
        <h3 className="gq-validator__roi-title">{tag}</h3>
        <select
          className="lt-input gq-parity__select"
          value={roiId ?? ''}
          onChange={(e) => setRoiId(e.target.value || null)}
        >
          <option value="">Select ROI…</option>
          {rois.map((r) => (
            <option key={r.id} value={r.id}>
              {r.displayName}
            </option>
          ))}
        </select>
        <button type="button" className="gq-btn gq-parity__fill" disabled={!app} onClick={fillFromApp}>
          Copy app → Fiji
        </button>
      </div>

      {parityMode && roi && (
        <div className="gq-parity__verify">
          <span className={areaIdentity ? 'gq-parity__ok' : 'gq-parity__bad'}>
            {areaIdentity ? '✓' : '✗'} Area = W×H (deterministic extraction)
          </span>
          <span className={intDenIdentity ? 'gq-parity__ok' : 'gq-parity__bad'}>
            {intDenIdentity ? '✓' : '✗'} IntDen = Area×Mean (no scaling)
          </span>
        </div>
      )}

      <table className="gq-validator__table gq-parity__inputs-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Fiji (enter)</th>
            <th>App (measured)</th>
          </tr>
        </thead>
        <tbody>
          {FIELDS.map(([key, label]) => (
            <tr key={key}>
              <td>{label}</td>
              <td>
                <input
                  type="number"
                  className="lt-input gq-validator__input"
                  value={fiji[key]}
                  onChange={(e) => setFiji({ ...fiji, [key]: e.target.value })}
                />
              </td>
              <td>{app ? fmt(app[key], key.includes('Mean') ? 4 : 2) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {report && (
        <>
          <table className="gq-validator__table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Fiji</th>
                <th>App</th>
                <th>Abs err</th>
                <th>% err</th>
              </tr>
            </thead>
            <tbody>
              {FIELDS.map(([key, label]) => (
                <MetricRow key={key} label={label} metric={report.metrics[key]} digits={key.includes('Mean') ? 4 : 2} />
              ))}
              <tr className="gq-validator__group">
                <td colSpan={5}>Excel-derived</td>
              </tr>
              <MetricRow label={METRIC_LABELS.background} metric={report.metrics.background} digits={2} />
              <MetricRow label={METRIC_LABELS.corrected} metric={report.metrics.corrected} digits={2} />
            </tbody>
          </table>

          <div className={`gq-parity__divergence${report.allWithinTolerance ? ' gq-parity__divergence--ok' : ''}`}>
            {report.divergence ? (
              <>
                <strong>Divergence: {report.divergence.label}</strong>
                {report.divergence.pct != null && ` (${fmt(report.divergence.pct, 4)}%)`}
                <div className="gq-parity__stage">→ {report.divergence.stage}</div>
              </>
            ) : (
              <strong>All metrics within ≤{report.tolerancePct}% — full parity.</strong>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function ParityAudit({ rois = [], fijiParityMode = true, onFijiParityModeChange }) {
  const measurable = useMemo(() => rois.filter((r) => r.measurements), [rois]);

  const [tol, setTol] = useState(1);
  const [roiAId, setRoiAId] = useState(null);
  const [roiBId, setRoiBId] = useState(null);
  const [useB, setUseB] = useState(false);
  const [fijiA, setFijiA] = useState({ ...EMPTY });
  const [fijiB, setFijiB] = useState({ ...EMPTY });

  const roiA = measurable.find((r) => r.id === roiAId) ?? null;
  const roiB = measurable.find((r) => r.id === roiBId) ?? null;
  const appA = appFromRoi(roiA);
  const appB = appFromRoi(roiB);

  const reportA = useMemo(
    () => (appA ? buildParityReport({ fiji: fijiFrom(fijiA), app: appA, tolerancePct: tol }) : null),
    [appA, fijiA, tol]
  );
  const reportB = useMemo(
    () => (useB && appB ? buildParityReport({ fiji: fijiFrom(fijiB), app: appB, tolerancePct: tol }) : null),
    [useB, appB, fijiB, tol]
  );

  const ratio = useMemo(
    () => (reportA && reportB ? buildRatioParity(reportA, reportB, tol) : null),
    [reportA, reportB, tol]
  );

  const copyReport = async () => {
    if (!reportA) return;
    const parts = [
      formatReportText({ title: roiA?.displayName, fiji: fijiFrom(fijiA), app: appA, report: reportA }),
    ];
    if (reportB) {
      parts.push('', formatReportText({ title: roiB?.displayName, fiji: fijiFrom(fijiB), app: appB, report: reportB, ratio }));
    }
    try {
      await navigator.clipboard.writeText(parts.join('\n'));
    } catch {
      /* clipboard may be unavailable; ignore */
    }
  };

  if (measurable.length === 0) {
    return (
      <div className="gq-validator gq-parity">
        <h2 className="gq-validator__title">Parity Audit</h2>
        <p className="gq-validator__subtitle">
          Load a gel and create at least one complete ROI (Target/Control) in Image View. Then return here, paste
          the matching Fiji measurements, and get a structured parity report.
        </p>
      </div>
    );
  }

  return (
    <div className="gq-validator gq-parity">
      <div className="gq-validator__header">
        <div>
          <h2 className="gq-validator__title">Parity Audit (Fiji → App → Excel)</h2>
          <p className="gq-validator__subtitle">
            Pick a measured ROI, paste its Fiji values, and compare end-to-end. The first metric (in pipeline order)
            that exceeds tolerance is flagged as the divergence point.
          </p>
        </div>
        <div className="gq-parity__controls">
          <label className="gq-parity__tol">
            Tolerance %
            <input
              type="number"
              className="lt-input gq-parity__tol-input"
              min={0}
              step={0.1}
              value={tol}
              onChange={(e) => setTol(Math.max(0, Number(e.target.value) || 0))}
            />
          </label>
          <label className="gq-validator__toggle">
            <input
              type="checkbox"
              checked={fijiParityMode}
              onChange={(e) => onFijiParityModeChange?.(e.target.checked)}
            />
            <span>Fiji Parity Mode</span>
          </label>
          <button type="button" className="gq-btn" disabled={!reportA} onClick={copyReport}>
            Copy report
          </button>
        </div>
      </div>

      {fijiParityMode && (
        <div className="gq-validator__formulas gq-parity__guarantees">
          <strong>Fiji Parity Mode — enforced guarantees:</strong>
          <span>• Raw pixel intensity only (no normalization, no scaling, no calibration)</span>
          <span>• Deterministic ROI extraction: integer pixel rectangle, Area = Width × Height</span>
          <span>• IntDen = Σ pixel values = Fiji RawIntDen = Fiji IntDen (uncalibrated images)</span>
        </div>
      )}

      <div className="gq-parity__panels">
        <RoiPanel
          tag="ROI A"
          rois={measurable}
          roiId={roiAId}
          setRoiId={setRoiAId}
          fiji={fijiA}
          setFiji={setFijiA}
          report={reportA}
          parityMode={fijiParityMode}
        />

        <div className="gq-parity__panel gq-parity__panel--optional">
          <label className="gq-validator__toggle">
            <input type="checkbox" checked={useB} onChange={(e) => setUseB(e.target.checked)} />
            <span>Second ROI (for ratio)</span>
          </label>
          {useB && (
            <RoiPanel
              tag="ROI B"
              rois={measurable}
              roiId={roiBId}
              setRoiId={setRoiBId}
              fiji={fijiB}
              setFiji={setFijiB}
              report={reportB}
              parityMode={fijiParityMode}
            />
          )}
        </div>
      </div>

      {ratio && (
        <table className="gq-validator__table gq-parity__ratio">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Fiji</th>
              <th>App</th>
              <th>Abs err</th>
              <th>% err</th>
            </tr>
          </thead>
          <tbody>
            <MetricRow label="Ratio (A / B)" metric={ratio} digits={6} />
          </tbody>
        </table>
      )}
    </div>
  );
}
