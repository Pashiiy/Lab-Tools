import { useMemo } from 'react';
import { computeTargetRatio } from '../../utils/parseTimeCourse';

const dilutionLabel = (dilution) => (dilution === null ? '—' : `1:${dilution}`);

function trendArrow(change) {
  if (change == null || Number.isNaN(change)) return '—';
  if (change > 0.05) return '↑';
  if (change < -0.05) return '↓';
  return '→';
}

function trendClass(change) {
  if (change == null) return '';
  if (change > 0) return 'qi-tc-summary__up';
  if (change < 0) return 'qi-tc-summary__down';
  return '';
}

export default function SummaryTable({
  normalizedData,
  selectedTargets,
  selectedDilutions,
  hasDilutionData = true,
  t0Timepoint,
  timepoints,
  chartView,
  ratioNumerator,
  ratioDenominator,
  showRatioRows,
}) {
  const lastTp = timepoints[timepoints.length - 1];

  const rows = useMemo(() => {
    const result = [];
    selectedTargets.forEach((target) => {
      selectedDilutions.forEach((dilution) => {
        const t0Row = normalizedData.find(
          (d) => d.timepoint === t0Timepoint && d.target === target && d.dilution === dilution
        );
        const lastRow = normalizedData.find(
          (d) => d.timepoint === lastTp && d.target === target && d.dilution === dilution
        );
        const lastPct = lastRow?.normalizedPercent ?? null;
        const change = lastPct != null ? lastPct - 100 : null;

        result.push({
          key: `${target}-${dilution}`,
          label: target,
          dilution: dilutionLabel(dilution),
          t0Pct: 100,
          lastPct,
          change,
          isRatio: false,
        });
      });
    });
    return result;
  }, [normalizedData, selectedTargets, selectedDilutions, t0Timepoint, lastTp]);

  const ratioRows = useMemo(() => {
    if (!showRatioRows || !ratioNumerator || !ratioDenominator) return [];
    const ratios = computeTargetRatio(normalizedData, ratioNumerator, ratioDenominator);

    return selectedDilutions.map((dilution) => {
      const t0 = ratios.find((r) => r.timepoint === t0Timepoint && r.dilution === dilution);
      const last = ratios.find((r) => r.timepoint === lastTp && r.dilution === dilution);
      const t0Ratio = t0?.ratio ?? 1;
      const lastRatio = last?.ratio ?? null;
      const changePct = lastRatio != null && t0Ratio ? ((lastRatio / t0Ratio - 1) * 100) : null;

      return {
        key: `ratio-${dilution}`,
        label: `${ratioNumerator}:${ratioDenominator} ratio`,
        dilution: dilutionLabel(dilution),
        t0Pct: t0Ratio != null ? `${t0Ratio.toFixed(2)}` : '—',
        lastPct: lastRatio != null ? lastRatio.toFixed(2) : null,
        change: changePct,
        isRatio: true,
      };
    });
  }, [
    showRatioRows,
    ratioNumerator,
    ratioDenominator,
    normalizedData,
    selectedDilutions,
    t0Timepoint,
    lastTp,
  ]);

  const allRows = [...rows, ...ratioRows];

  return (
    <section className="qi-card qi-tc-summary">
      <h3 className="qi-section-title">Summary</h3>
      <div className="qi-table-wrap">
        <table className="qi-table qi-tc-summary-table">
          <thead>
            <tr>
              <th>Target</th>
              {hasDilutionData && <th>Dilution</th>}
              <th>T0</th>
              <th>Last TP</th>
              <th>Change</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody>
            {allRows.map((row) => (
              <tr key={row.key}>
                <td>{row.label}</td>
                {hasDilutionData && <td className="qi-mono">{row.dilution}</td>}
                <td className="qi-mono">
                  {row.isRatio ? row.t0Pct : `${row.t0Pct.toFixed(1)}%`}
                </td>
                <td className="qi-mono">
                  {row.lastPct == null
                    ? '—'
                    : row.isRatio
                      ? row.lastPct
                      : `${row.lastPct.toFixed(1)}%`}
                </td>
                <td className={`qi-mono ${trendClass(row.change)}`}>
                  {row.change == null
                    ? '—'
                    : row.isRatio
                      ? `${row.change >= 0 ? '+' : ''}${row.change.toFixed(1)}%`
                      : `${row.change >= 0 ? '+' : ''}${row.change.toFixed(1)}%`}
                </td>
                <td className={trendClass(row.change)}>{trendArrow(row.change)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
