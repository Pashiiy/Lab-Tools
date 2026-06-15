import { useState } from 'react';

export default function PointsTable({ curve }) {
  const [open, setOpen] = useState(false);

  if (!curve) return null;

  const rows = curve.points.map((p) => {
    const predicted = curve.slope * p.logQuantity + curve.intercept;
    const residual = p.meanCq - predicted;
    return { ...p, predicted, residual };
  });

  const title =
    curve.seriesLabel === 'combined'
      ? curve.target
      : `${curve.target} (${curve.seriesLabel})`;

  return (
    <section className="qi-card qi-sc-points">
      <button
        type="button"
        className="qi-sc-points__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>Regression points — {title}</span>
        <span aria-hidden>{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="qi-table-wrap">
          <table className="qi-table qi-sc-points-table">
            <thead>
              <tr>
                <th>Sample</th>
                <th>Dilution</th>
                <th>log₁₀(Qty)</th>
                <th>Mean Cq</th>
                <th>Residual</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.sampleName}>
                  <td>{row.sampleName}</td>
                  <td className="qi-mono">1:{row.dilutionDenominator}</td>
                  <td className="qi-mono">{row.logQuantity.toFixed(4)}</td>
                  <td className="qi-mono">{row.meanCq.toFixed(4)}</td>
                  <td
                    className="qi-mono"
                    style={{
                      color: Math.abs(row.residual) > 0.5 ? '#F87171' : 'inherit',
                    }}
                  >
                    {row.residual >= 0 ? '+' : ''}
                    {row.residual.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
