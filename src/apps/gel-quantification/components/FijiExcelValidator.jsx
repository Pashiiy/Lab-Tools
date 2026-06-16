import { useMemo, useState } from 'react';
import {
  excelBackground,
  excelCorrected,
  excelRatio,
} from '../engine/fijiExcelWorkflow';

/**
 * Fiji/Excel Validator.
 *
 * Enter the Fiji IntDen values and ROI dimensions for one or two ROIs. The tool
 * computes each result TWICE:
 *   • "Excel" column — a literal, inline transcription of the spreadsheet
 *     formulas (an independent code path, the ground truth).
 *   • "Application" column — the values produced by the engine functions that
 *     drive the rest of the app (engine/fijiExcelWorkflow.js).
 * It then reports absolute and percent difference. If the app reproduces the
 * spreadsheet, every difference is 0.
 */

const DEFAULT_ROI = { innerIntDen: '', outerIntDen: '', innerW: '', innerH: '', outerW: '', outerH: '' };

function num(v) {
  if (v === '' || v == null) return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function fmt(n, digits = 4) {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

/** Independent, literal transcription of the spreadsheet — the ground truth. */
function excelReference({ innerIntDen, outerIntDen, innerArea, outerArea }) {
  const denom = outerArea - innerArea;
  if (!(denom > 0)) return { background: null, corrected: null };
  const background = ((outerIntDen - innerIntDen) * innerArea) / denom;
  const corrected = innerIntDen - background;
  return { background, corrected };
}

function deriveRoi(roi) {
  const innerIntDen = num(roi.innerIntDen);
  const outerIntDen = num(roi.outerIntDen);
  const innerW = num(roi.innerW);
  const innerH = num(roi.innerH);
  const outerW = num(roi.outerW);
  const outerH = num(roi.outerH);
  const innerArea = innerW * innerH;
  const outerArea = outerW * outerH;

  const ready =
    Number.isFinite(innerIntDen) &&
    Number.isFinite(outerIntDen) &&
    innerArea > 0 &&
    outerArea > 0 &&
    outerArea > innerArea;

  if (!ready) return { ready: false, innerArea, outerArea };

  const inputs = { innerIntDen, outerIntDen, innerArea, outerArea };
  const ref = excelReference(inputs);
  const appBackground = excelBackground(inputs);
  const appCorrected = excelCorrected(inputs);

  return {
    ready: true,
    innerArea,
    outerArea,
    excel: ref,
    app: { background: appBackground, corrected: appCorrected },
  };
}

function diffCells(excel, app) {
  if (excel == null || app == null || !Number.isFinite(excel) || !Number.isFinite(app)) {
    return { abs: null, pct: null, match: false };
  }
  const abs = app - excel;
  const pct = excel === 0 ? null : (abs / Math.abs(excel)) * 100;
  return { abs, pct, match: Math.abs(abs) < 1e-9 };
}

function RoiInputs({ title, roi, onChange }) {
  const field = (key, label) => (
    <label className="gq-validator__field">
      <span>{label}</span>
      <input
        type="number"
        className="lt-input gq-validator__input"
        value={roi[key]}
        onChange={(e) => onChange({ ...roi, [key]: e.target.value })}
      />
    </label>
  );
  return (
    <div className="gq-validator__roi">
      <h4 className="gq-validator__roi-title">{title}</h4>
      {field('innerIntDen', 'Inner IntDen')}
      {field('outerIntDen', 'Outer IntDen')}
      <div className="gq-validator__dims">
        {field('innerW', 'Inner W')}
        {field('innerH', 'Inner H')}
      </div>
      <div className="gq-validator__dims">
        {field('outerW', 'Outer W')}
        {field('outerH', 'Outer H')}
      </div>
    </div>
  );
}

function ResultRow({ label, excel, app, digits = 4 }) {
  const { abs, pct, match } = diffCells(excel, app);
  return (
    <tr className={match ? 'gq-validator__row--match' : abs != null ? 'gq-validator__row--mismatch' : ''}>
      <td>{label}</td>
      <td>{fmt(excel, digits)}</td>
      <td>{fmt(app, digits)}</td>
      <td>{abs == null ? '—' : fmt(abs, 6)}</td>
      <td>{pct == null ? '—' : `${fmt(pct, 6)}%`}</td>
    </tr>
  );
}

export default function FijiExcelValidator() {
  const [roiA, setRoiA] = useState({ ...DEFAULT_ROI });
  const [roiB, setRoiB] = useState({ ...DEFAULT_ROI });
  const [useB, setUseB] = useState(false);

  const a = useMemo(() => deriveRoi(roiA), [roiA]);
  const b = useMemo(() => deriveRoi(roiB), [roiB]);

  const ratio = useMemo(() => {
    if (!useB || !a.ready || !b.ready) return null;
    const excel =
      a.excel.corrected != null && b.excel.corrected != null && b.excel.corrected !== 0
        ? a.excel.corrected / b.excel.corrected
        : null;
    const app = excelRatio(a.app.corrected, b.app.corrected);
    return { excel, app };
  }, [useB, a, b]);

  const loadExample = () => {
    setRoiA({ innerIntDen: '78000', outerIntDen: '130800', innerW: '20', innerH: '30', outerW: '36', outerH: '46' });
    setRoiB({ innerIntDen: '64000', outerIntDen: '116800', innerW: '20', innerH: '30', outerW: '36', outerH: '46' });
    setUseB(true);
  };

  return (
    <div className="gq-validator">
      <div className="gq-validator__header">
        <div>
          <h2 className="gq-validator__title">Fiji / Excel Validator</h2>
          <p className="gq-validator__subtitle">
            Enter Fiji IntDen values and ROI dimensions. The app result is compared to a literal
            transcription of your spreadsheet formulas. Differences should be 0.
          </p>
        </div>
        <button type="button" className="gq-btn" onClick={loadExample}>
          Load example
        </button>
      </div>

      <div className="gq-validator__formulas">
        <code>Background = (OuterIntDen − InnerIntDen) × InnerArea / (OuterArea − InnerArea)</code>
        <code>Corrected = InnerIntDen − Background</code>
        <code>Ratio = Corrected_A / Corrected_B</code>
        <span className="gq-validator__note">Area = Width × Height (pixels)</span>
      </div>

      <div className="gq-validator__inputs">
        <RoiInputs title="ROI A" roi={roiA} onChange={setRoiA} />
        <div className="gq-validator__roi gq-validator__roi--optional">
          <label className="gq-validator__toggle">
            <input type="checkbox" checked={useB} onChange={(e) => setUseB(e.target.checked)} />
            <span>ROI B (for ratio)</span>
          </label>
          {useB && <RoiInputs title="ROI B" roi={roiB} onChange={setRoiB} />}
        </div>
      </div>

      <table className="gq-validator__table">
        <thead>
          <tr>
            <th>Value</th>
            <th>Excel</th>
            <th>Application</th>
            <th>Abs diff</th>
            <th>% diff</th>
          </tr>
        </thead>
        <tbody>
          <tr className="gq-validator__group">
            <td colSpan={5}>ROI A {a.ready ? `(inner ${a.innerArea}px · outer ${a.outerArea}px)` : '— enter values'}</td>
          </tr>
          <ResultRow label="Background" excel={a.excel?.background} app={a.app?.background} digits={2} />
          <ResultRow label="Corrected" excel={a.excel?.corrected} app={a.app?.corrected} digits={2} />

          {useB && (
            <>
              <tr className="gq-validator__group">
                <td colSpan={5}>ROI B {b.ready ? `(inner ${b.innerArea}px · outer ${b.outerArea}px)` : '— enter values'}</td>
              </tr>
              <ResultRow label="Background" excel={b.excel?.background} app={b.app?.background} digits={2} />
              <ResultRow label="Corrected" excel={b.excel?.corrected} app={b.app?.corrected} digits={2} />
              <tr className="gq-validator__group">
                <td colSpan={5}>Ratio (A / B)</td>
              </tr>
              <ResultRow label="Ratio" excel={ratio?.excel} app={ratio?.app} digits={6} />
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
