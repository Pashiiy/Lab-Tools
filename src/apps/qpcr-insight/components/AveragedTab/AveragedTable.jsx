import { useMemo, useState } from 'react';
import Sparkline from './Sparkline';

function FlagBadge({ type, children }) {
  return <span className={`qi-flag qi-flag--${type}`}>{children}</span>;
}

export default function AveragedTable({ rows, sampleColors, outlierIds, replicates }) {
  const [hoveredSample, setHoveredSample] = useState(null);

  const outlierGroups = useMemo(() => {
    const groups = new Set();
    replicates.forEach((r) => {
      if (outlierIds.has(r.id)) {
        groups.add(`${r.sampleName}||${r.targetName}`);
      }
    });
    return groups;
  }, [replicates, outlierIds]);

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const s = a.sampleName.localeCompare(b.sampleName);
        return s !== 0 ? s : a.targetName.localeCompare(b.targetName);
      }),
    [rows]
  );

  let prevGroupKey = null;

  return (
    <div className="qi-table-wrap">
      <table className="qi-table qi-averaged-table">
        <thead>
          <tr>
            <th>Sample</th>
            <th>Target</th>
            <th>n</th>
            <th>Mean Cq</th>
            <th>SD</th>
            <th>CV%</th>
            <th>Undetermined</th>
            <th>Replicates</th>
            <th>Flags</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const groupKey = `${row.sampleName}||${row.targetName}`;
            const isGroupStart = groupKey !== prevGroupKey;
            prevGroupKey = groupKey;
            const hasOutlier = outlierGroups.has(groupKey);
            const highCv = row.cv != null && row.cv > 5;
            const allUndet = row.meanCq === null;

            return (
              <tr
                key={groupKey}
                className={[
                  isGroupStart ? 'qi-raw-table__group-start' : '',
                  hoveredSample === row.sampleName ? 'qi-raw-table__row--highlight' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ borderLeftColor: sampleColors[row.sampleName] || 'var(--qi-border)' }}
                onMouseEnter={() => setHoveredSample(row.sampleName)}
                onMouseLeave={() => setHoveredSample(null)}
              >
                <td>{row.sampleName}</td>
                <td>{row.targetName}</td>
                <td className="qi-mono">{row.n}</td>
                <td className="qi-mono">
                  {row.meanCq === null ? '—' : row.meanCq.toFixed(3)}
                </td>
                <td className="qi-mono">{row.n > 1 && row.sd != null ? row.sd.toFixed(4) : '—'}</td>
                <td className={`qi-mono${highCv ? ' qi-text-warn' : ''}`}>
                  {row.cv != null ? `${row.cv.toFixed(1)}%` : '—'}
                </td>
                <td className="qi-mono">{row.undeterminedCount}</td>
                <td>
                  <Sparkline values={row.cqValues} mean={row.meanCq} />
                </td>
                <td className="qi-flags-cell">
                  {highCv && <FlagBadge type="warn">HIGH CV</FlagBadge>}
                  {hasOutlier && <FlagBadge type="outlier">OUTLIER</FlagBadge>}
                  {allUndet && <FlagBadge type="undet">ALL UNDET</FlagBadge>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
