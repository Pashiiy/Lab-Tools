function AmpStatus({ value }) {
  if (!value) return '—';
  const str = String(value);
  if (/^amp$/i.test(str.trim())) {
    return <span className="amp-yes">Amp</span>;
  }
  if (/no\s*amp/i.test(str)) {
    return <span className="amp-no">No Amp</span>;
  }
  return str;
}

function FlagBadges({ row }) {
  const flags = [];
  if (row.isNTC) flags.push({ label: 'NTC', className: 'flag-ntc' });
  if (row.isUndetermined) flags.push({ label: 'UNDEF', className: 'flag-undef' });
  if (row.isOutlier) flags.push({ label: 'OUTLIER', className: 'flag-outlier' });
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

export default function RawTable({ rows, sampleColors, hoveredSample, onHoverSample }) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Well</th>
            <th>Sample</th>
            <th>Target</th>
            <th>CT</th>
            <th>SD</th>
            <th>Amp Status</th>
            <th>Flags</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const prev = rows[idx - 1];
            const groupKey = `${row.sampleName}||${row.targetName}`;
            const prevKey = prev ? `${prev.sampleName}||${prev.targetName}` : null;
            const showDivider = prevKey && prevKey !== groupKey;
            const color = sampleColors[row.sampleName] || '#8B949E';
            const isHovered = hoveredSample === row.sampleName;

            return (
              <tr
                key={row._id}
                className={[
                  showDivider ? 'row-divider' : '',
                  row.isNTC ? 'row-ntc' : '',
                  row.isOutlier ? 'row-outlier' : '',
                  isHovered ? 'row-sample-hover' : '',
                  idx % 2 === 1 ? 'row-even' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ '--sample-color': color }}
                onMouseEnter={() => onHoverSample(row.sampleName)}
                onMouseLeave={() => onHoverSample(null)}
              >
                <td className="mono">{row.wellPosition || row.well || '—'}</td>
                <td>{row.sampleName || '—'}</td>
                <td>{row.targetName || '—'}</td>
                <td className={`mono ct-cell${row.isUndetermined ? ' ct-undef' : ''}`}>
                  {row.ct !== null ? row.ct.toFixed(2) : '—'}
                </td>
                <td className="mono">
                  {row.ctSd !== null ? row.ctSd.toFixed(3) : ''}
                </td>
                <td>
                  <AmpStatus value={row.ampStatus} />
                </td>
                <td>
                  <FlagBadges row={row} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
