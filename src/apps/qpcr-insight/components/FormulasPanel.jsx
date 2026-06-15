import GlobalDrawer from '../../../shared/GlobalDrawer';

const SECTIONS = [
  {
    id: 'ddct',
    title: 'ΔΔCt & RQ',
    items: [
      {
        name: 'ΔCt (per sample)',
        formula: 'ΔCt = Cq(target) − Cq(reference gene)',
        note: 'Each sample is normalized to its own reference gene measurement (e.g. Kcc4).',
      },
      {
        name: 'Relative quantity (RQ)',
        formula: 'RQ = 2^(−ΔCt)',
        note: 'Primary result — comparable across samples when the same reference gene is used.',
      },
      {
        name: 'ΔΔCt (optional calibrator)',
        formula: 'ΔΔCt = ΔCt(sample) − ΔCt(calibrator)',
        note: 'Only computed when a calibrator sample is selected.',
      },
      {
        name: 'Fold change (optional calibrator)',
        formula: 'Fold Change = 2^(−ΔΔCt)',
        note: 'Values > 1 = up-regulated vs calibrator; < 1 = down-regulated.',
      },
      {
        name: 'Error propagation',
        formula: 'SE(ΔCt) = √(SD²_target/n + SD²_ref/n)',
        note: 'RQ and fold-change error bars are derived from these standard errors.',
      },
    ],
  },
  {
    id: 'timecourse',
    title: 'Time Course',
    items: [
      {
        name: '% of T0',
        formula: '% of T0 = (RQ / RQ_T0) × 100',
        note: 'Normalized independently per target and dilution. T0 is the selected baseline timepoint.',
      },
      {
        name: 'Fold vs T0',
        formula: 'Fold vs T0 = RQ / RQ_T0',
        note: 'Equivalent to % of T0 ÷ 100. Log₂ scale: log₂(Fold vs T0).',
      },
      {
        name: 'Target ratio',
        formula: 'Ratio = RQ(numerator) / RQ(denominator)',
        note: 'e.g. Galcen:Cen3 — stays near 1 when both targets change proportionally.',
      },
      {
        name: 'Sample name format',
        formula: '"{timepoint} 1:{dilution}"  e.g. "0 1:100", "24 1:10000"',
        note: 'Timepoint and dilution are parsed from sample names for grouping.',
      },
    ],
  },
  {
    id: 'stdcurve',
    title: 'Standard Curve',
    items: [
      {
        name: 'Regression model',
        formula: 'Cq = slope × log₁₀(quantity) + intercept',
        note: 'log₁₀(quantity) = −log₁₀(dilution denominator) for 1:10, 1:100, etc.',
      },
      {
        name: 'Amplification efficiency',
        formula: 'Efficiency (%) = (10^(−1/slope) − 1) × 100',
        note: '100% efficiency ≈ slope of −3.32 (each 10× dilution ≈ +3.32 Cq).',
      },
      {
        name: 'Goodness of fit',
        formula: 'R² from linear regression residuals',
        note: 'Good: 90–110% efficiency and R² ≥ 0.99. Acceptable: 80–120% and R² ≥ 0.98.',
      },
      {
        name: 'Residual',
        formula: 'Residual = Cq_observed − Cq_predicted',
        note: 'Helps identify outlier dilution points dragging down R².',
      },
    ],
  },
];

export default function FormulasPanel({ open, onClose }) {
  return (
    <GlobalDrawer
      open={open}
      onClose={onClose}
      title="Analysis Formulas"
      subtitle="qPCR Analysis — ΔΔCt, Time Course, Standard Curve"
      width={480}
    >
      <div className="qi-formulas-panel">
        {SECTIONS.map((section) => (
          <section key={section.id} className="qi-formulas-section">
            <h3 className="qi-formulas-section__title">{section.title}</h3>
            <ul className="qi-formulas-list">
              {section.items.map((item) => (
                <li key={item.name} className="qi-formulas-item">
                  <div className="qi-formulas-item__name">{item.name}</div>
                  <code className="qi-formulas-item__formula">{item.formula}</code>
                  <p className="qi-formulas-item__note">{item.note}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </GlobalDrawer>
  );
}

export function FormulasButton({ onClick, className = '' }) {
  return (
    <button
      type="button"
      className={`qi-formulas-btn${className ? ` ${className}` : ''}`}
      onClick={onClick}
      title="View analysis formulas"
      aria-label="View analysis formulas"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
        <path
          d="M12 11v5M12 8h.01"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
      <span>Formulas</span>
    </button>
  );
}
