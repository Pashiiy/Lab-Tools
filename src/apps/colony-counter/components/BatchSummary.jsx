import { useMemo, useRef } from 'react';
import ComparisonBarChart from '../../../shared/viz/ComparisonBarChart';
import { exportNodeAsPng } from '../../../shared/viz/exportChartPng';
import { getChartTheme } from '../../../shared/viz/chartTheme';
import { calcCFU } from '../utils/cfu';

function plateDilutionFactor(plate) {
  const cfu = plate.cfu || {};
  if (cfu.dilutionMode === 'custom') return parseFloat(cfu.customDilution);
  const exp = Math.abs(cfu.dilutionExponent ?? 1);
  return Math.pow(10, -exp);
}

function plateRows(plates) {
  return (plates || []).map((p, i) => {
    const count = p.dots?.length ?? 0;
    const dilutionFactor = plateDilutionFactor(p);
    const volumeMl = p.cfu?.volumeMl ?? 0.1;
    const cfu = calcCFU(count, dilutionFactor, volumeMl);
    return {
      name: p.sampleName || p.name || `Plate ${i + 1}`,
      count,
      cfu,
      strain: p.strain || '',
      treatment: p.treatment || '',
      timePoint: p.timePoint || '',
      replicate: p.replicate || '',
      date: p.date || '',
      notes: p.notes || '',
    };
  });
}

/** Group by treatment (or strain) for mean ± SD when replicates exist. */
function groupStats(rows, groupKey) {
  const map = new Map();
  rows.forEach((r) => {
    const key = r[groupKey] || r.name;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r.count);
  });
  return [...map.entries()].map(([name, vals]) => {
    const n = vals.length;
    const mean = vals.reduce((a, b) => a + b, 0) / n;
    const variance = n > 1 ? vals.reduce((a, v) => a + (v - mean) ** 2, 0) / (n - 1) : 0;
    const sd = Math.sqrt(variance);
    return { name, value: Math.round(mean * 100) / 100, error: n > 1 ? Math.round(sd * 100) / 100 : 0, n };
  });
}

export default function BatchSummary({ plates, sessionName }) {
  const chartRef = useRef(null);
  const rows = useMemo(() => plateRows(plates), [plates]);
  const countData = useMemo(
    () => rows.map((r) => ({ name: r.name, value: r.count })),
    [rows]
  );
  const groupKey = rows.some((r) => r.treatment) ? 'treatment' : rows.some((r) => r.strain) ? 'strain' : null;
  const grouped = useMemo(
    () => (groupKey ? groupStats(rows, groupKey) : []),
    [rows, groupKey]
  );

  const exportCsv = () => {
    const header = ['sampleName', 'colonyCount', 'cfuPerMl', 'strain', 'treatment', 'timePoint', 'replicate', 'date', 'notes'];
    const lines = [
      header.join(','),
      ...rows.map((r) =>
        [r.name, r.count, r.cfu ?? '', r.strain, r.treatment, r.timePoint, r.replicate, r.date, JSON.stringify(r.notes || '')].join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${sessionName || 'colony-batch'}-summary.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ sessionName, plates: rows }, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${sessionName || 'colony-batch'}-summary.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportPng = async () => {
    const theme = getChartTheme();
    await exportNodeAsPng(chartRef.current, `${sessionName || 'colony-batch'}-chart.png`, {
      backgroundColor: theme.exportBg,
    });
  };

  if (!plates?.length) {
    return <p className="cc-batch-summary__empty">Add plates to see batch summary charts.</p>;
  }

  return (
    <div className="cc-batch-summary">
      <div className="cc-batch-summary__actions">
        <button type="button" className="lt-btn" onClick={exportCsv}>
          Export CSV
        </button>
        <button type="button" className="lt-btn" onClick={exportJson}>
          Export JSON
        </button>
        <button type="button" className="lt-btn lt-btn--primary" onClick={exportPng}>
          Export Chart PNG
        </button>
      </div>

      <div ref={chartRef} className="cc-batch-summary__charts">
        <h3 className="cc-batch-summary__title">Colony count by plate</h3>
        <ComparisonBarChart data={countData} />

        {grouped.length > 1 && (
          <>
            <h3 className="cc-batch-summary__title">
              Mean ± SD by {groupKey}
            </h3>
            <ComparisonBarChart data={grouped} />
          </>
        )}
      </div>

      <table className="cc-batch-summary__table">
        <thead>
          <tr>
            <th>Sample</th>
            <th>Count</th>
            <th>CFU/mL</th>
            <th>Strain</th>
            <th>Treatment</th>
            <th>Rep</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name + r.date + r.replicate}>
              <td>{r.name}</td>
              <td>{r.count}</td>
              <td>{r.cfu != null ? r.cfu.toExponential(2) : '—'}</td>
              <td>{r.strain || '—'}</td>
              <td>{r.treatment || '—'}</td>
              <td>{r.replicate || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
