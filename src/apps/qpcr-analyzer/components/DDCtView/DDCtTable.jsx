import { useState } from 'react';

function DDCtFlags({ row, isControl }) {
  const flags = [];
  if (row.warning) flags.push({ label: 'MISSING', className: 'flag-undef' });
  if (row.noSd && !isControl && row.foldChange !== null) {
    flags.push({ label: 'NO SD', className: 'flag-outlier' });
  }
  if (flags.length === 0) return null;
  return (
    <span className="flag-group">
      {flags.map((f) => (
        <span key={f.label} className={`flag ${f.className}`}>
          {f.label}
        </span>
      ))}
    </span>
  );
}

function formatDdCt(value) {
  if (value === null || value === undefined) return '—';
  if (value > 0) return <span className="ddct-pos">{value.toFixed(4)}</span>;
  if (value < 0) return <span className="ddct-neg">{value.toFixed(4)}</span>;
  return <span className="ddct-zero">{value.toFixed(4)}</span>;
}

function formatFoldChange(row, isControl) {
  if (row.foldChange === null) return '—';
  if (isControl) {
    return <span className="fc-control">1.0000 (ref)</span>;
  }
  if (row.foldChange > 1) {
    return <span className="fc-up">{row.foldChange.toFixed(4)}</span>;
  }
  if (row.foldChange < 1) {
    return <span className="fc-down">{row.foldChange.toFixed(4)}</span>;
  }
  return <span className="fc-control">{row.foldChange.toFixed(4)}</span>;
}

export default function DDCtTable({
  results,
  controlSample,
  sampleColors,
}) {
  const [hoveredSample, setHoveredSample] = useState(null);

  return (
    <div className="table-scroll">
      <table className="data-table ddct-table">
        <thead>
          <tr>
            <th>Sample</th>
            <th>Target</th>
            <th>ΔCt</th>
            <th>ΔΔCt</th>
            <th>Fold Change</th>
            <th>±Error</th>
            <th>Flags</th>
          </tr>
        </thead>
        <tbody>
          {results.map((row, idx) => {
            const isControl = row.sample === controlSample;
            const color = sampleColors[row.sample] || '#8B949E';
            const isHovered = hoveredSample === row.sample;

            return (
              <tr
                key={`${row.sample}||${row.target}`}
                className={[
                  isControl ? 'row-control' : '',
                  isHovered ? 'row-sample-hover' : '',
                  idx % 2 === 1 ? 'row-even' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ '--sample-color': color }}
                onMouseEnter={() => setHoveredSample(row.sample)}
                onMouseLeave={() => setHoveredSample(null)}
              >
                <td>{row.sample}</td>
                <td>{row.target}</td>
                <td className="mono">
                  {row.deltaCt !== null ? row.deltaCt.toFixed(4) : '—'}
                </td>
                <td className="mono">{formatDdCt(row.ddCt)}</td>
                <td className="mono">{formatFoldChange(row, isControl)}</td>
                <td className="mono error-cell">
                  {isControl || row.foldChange === null ? (
                    ''
                  ) : (
                    <>
                      +{row.errorPlus?.toFixed(4) ?? '—'} / −
                      {row.errorMinus?.toFixed(4) ?? '—'}
                    </>
                  )}
                </td>
                <td>
                  <DDCtFlags row={row} isControl={isControl} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
