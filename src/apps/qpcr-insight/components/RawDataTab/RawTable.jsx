import { useMemo, useState } from 'react';

function FlagBadge({ type, children }) {
  return <span className={`qi-flag qi-flag--${type}`}>{children}</span>;
}

export default function RawTable({
  rows,
  hasWellColumn,
  sampleColors,
  outlierIds,
}) {
  const [hoveredSample, setHoveredSample] = useState(null);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const sampleCmp = a.sampleName.localeCompare(b.sampleName);
      if (sampleCmp !== 0) return sampleCmp;
      const targetCmp = a.targetName.localeCompare(b.targetName);
      if (targetCmp !== 0) return targetCmp;
      return (a.well || '').localeCompare(b.well || '');
    });
  }, [rows]);

  let prevGroupKey = null;

  return (
    <div className="qi-table-wrap">
      <table className="qi-table qi-raw-table">
        <thead>
          <tr>
            {hasWellColumn && <th>Well</th>}
            <th>Sample</th>
            <th>Target</th>
            <th>Cq</th>
            <th>Task</th>
            <th>Flags</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => {
            const groupKey = `${row.sampleName}||${row.targetName}`;
            const isGroupStart = groupKey !== prevGroupKey;
            prevGroupKey = groupKey;
            const borderColor = row.isNTC
              ? sampleColors.NTC
              : sampleColors[row.sampleName] || 'var(--qi-border)';
            const isHovered = hoveredSample === row.sampleName;

            return (
              <tr
                key={row.id}
                className={[
                  isGroupStart ? 'qi-raw-table__group-start' : '',
                  isHovered ? 'qi-raw-table__row--highlight' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ borderLeftColor: borderColor }}
                onMouseEnter={() => setHoveredSample(row.sampleName)}
                onMouseLeave={() => setHoveredSample(null)}
              >
                {hasWellColumn && <td className="qi-mono">{row.well || '—'}</td>}
                <td>{row.sampleName}</td>
                <td>{row.targetName}</td>
                <td className="qi-mono">
                  {row.cq === null ? (
                    <span className="qi-text-undet">Undetermined</span>
                  ) : (
                    row.cq.toFixed(3)
                  )}
                </td>
                <td className="qi-text-muted">{row.task || '—'}</td>
                <td className="qi-flags-cell">
                  {row.isNTC && <FlagBadge type="ntc">NTC</FlagBadge>}
                  {row.cq === null && <FlagBadge type="undet">UNDET</FlagBadge>}
                  {outlierIds.has(row.id) && <FlagBadge type="outlier">OUTLIER</FlagBadge>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
