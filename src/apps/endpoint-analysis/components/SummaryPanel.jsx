import { REPAIR_COLORS, REPAIR_PRODUCTS } from '../constants/categories';

export default function SummaryPanel({ summaryCounts, colonyCount }) {
  const { counts, classifiedTotal } = summaryCounts;

  return (
    <div className="summary-panel">
      <h3 className="summary-panel__title">Overview</h3>
      <div className="summary-panel__metrics">
        <div className="summary-panel__metric">
          <span className="summary-panel__metric-label">Classified</span>
          <span className="summary-panel__metric-value">
            {classifiedTotal} / {colonyCount}
          </span>
        </div>
        <div className="summary-panel__metric">
          <span className="summary-panel__metric-label">Unclassified</span>
          <span className="summary-panel__metric-value">{counts.UNCLASSIFIED || 0}</span>
        </div>
      </div>
      <div className="summary-panel__rows">
        {REPAIR_PRODUCTS.map((product) => {
          const count = counts[product] || 0;
          const isUnclassified = product === 'UNCLASSIFIED';
          const pct =
            !isUnclassified && classifiedTotal > 0
              ? ((count / classifiedTotal) * 100).toFixed(1)
              : null;

          return (
            <div key={product} className="summary-panel__row">
              <span
                className="summary-panel__swatch"
                style={{ backgroundColor: REPAIR_COLORS[product] }}
              />
              <span className="summary-panel__name">{product}</span>
              <span className="summary-panel__count">{count}</span>
              <span className="summary-panel__pct">
                {isUnclassified ? '—' : `${pct}%`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
