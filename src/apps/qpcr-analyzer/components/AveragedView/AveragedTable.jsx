import ReplicateSparkline from '../RawDataView/ReplicateSparkline';

function AveragedFlags({ row }) {
  const flags = [];
  if (row.meanCt === null) {
    flags.push({ label: 'ALL UNDEF', className: 'flag-undef' });
  }
  if (row.cv !== null && row.cv > 5) {
    flags.push({ label: 'HIGH CV', className: 'flag-outlier' });
  }
  if (row.hasOutlier) {
    flags.push({ label: 'OUTLIER', className: 'flag-outlier' });
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

export default function AveragedTable({ data, sampleColors, hoveredSample, onHoverSample }) {
  return (
    <div className="table-scroll">
      <table className="data-table averaged-table">
        <thead>
          <tr>
            <th>Sample</th>
            <th>Target</th>
            <th>n</th>
            <th>Mean CT</th>
            <th>SD</th>
            <th>CV%</th>
            <th>Undetermined</th>
            <th>Replicates</th>
            <th>Flags</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const color = sampleColors[row.sampleName] || '#8B949E';
            const isHovered = hoveredSample === row.sampleName;

            return (
              <tr
                key={row.key}
                className={[
                  row.hasOutlier ? 'row-outlier' : '',
                  isHovered ? 'row-sample-hover' : '',
                  idx % 2 === 1 ? 'row-even' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ '--sample-color': color }}
                onMouseEnter={() => onHoverSample(row.sampleName)}
                onMouseLeave={() => onHoverSample(null)}
              >
                <td>{row.sampleName}</td>
                <td>{row.targetName}</td>
                <td className="mono">{row.n}</td>
                <td className="mono">
                  {row.meanCt !== null ? row.meanCt.toFixed(3) : '—'}
                </td>
                <td className="mono">
                  {row.sd !== null ? row.sd.toFixed(4) : '—'}
                </td>
                <td
                  className={`mono${row.cv !== null && row.cv > 5 ? ' cv-high' : ''}`}
                >
                  {row.cv !== null ? `${row.cv.toFixed(1)}%` : '—'}
                </td>
                <td
                  className={`mono${row.undeterminedCount > 0 ? ' undef-count' : ''}`}
                >
                  {row.undeterminedCount}/{row.totalCount}
                </td>
                <td>
                  <ReplicateSparkline
                    ctValues={row.ctValues}
                    meanCt={row.meanCt}
                    color={color}
                  />
                </td>
                <td>
                  <AveragedFlags row={row} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
