function r2Color(r2) {
  if (r2 >= 0.99) return '#4ADE80';
  if (r2 >= 0.98) return '#FBBF24';
  return '#F87171';
}

function efficiencyColor(efficiency) {
  if (efficiency === null) return 'var(--qi-text-muted)';
  if (efficiency >= 90 && efficiency <= 110) return '#4ADE80';
  if (efficiency >= 80 && efficiency <= 120) return '#FBBF24';
  return '#F87171';
}

function qualityClass(quality) {
  if (quality === 'Good') return 'qi-sc-quality--good';
  if (quality === 'Acceptable') return 'qi-sc-quality--acceptable';
  if (quality === 'Poor') return 'qi-sc-quality--poor';
  return 'qi-sc-quality--unknown';
}

export default function EfficiencyTable({ curves, selectedCurveId, onSelectCurve }) {
  return (
    <div className="qi-table-wrap">
      <table className="qi-table qi-sc-efficiency-table">
        <thead>
          <tr>
            <th>Target</th>
            <th>Series</th>
            <th>Slope</th>
            <th>Intercept</th>
            <th>R²</th>
            <th>Efficiency</th>
            <th>Quality</th>
          </tr>
        </thead>
        <tbody>
          {curves.map((curve) => {
            const id = `${curve.target}||${curve.seriesLabel}`;
            return (
              <tr
                key={id}
                className={selectedCurveId === id ? 'qi-sc-efficiency-table__row--selected' : ''}
                onClick={() => onSelectCurve(id)}
              >
                <td>{curve.target}</td>
                <td>{curve.seriesLabel}</td>
                <td className="qi-mono">{curve.slope.toFixed(4)}</td>
                <td className="qi-mono">{curve.intercept.toFixed(4)}</td>
                <td className="qi-mono" style={{ color: r2Color(curve.r2) }}>
                  {curve.r2.toFixed(4)}
                </td>
                <td className="qi-mono" style={{ color: efficiencyColor(curve.efficiency) }}>
                  {curve.efficiency !== null ? `${curve.efficiency.toFixed(1)}%` : '—'}
                </td>
                <td>
                  <span className={`qi-sc-quality ${qualityClass(curve.quality)}`}>
                    {curve.quality}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
