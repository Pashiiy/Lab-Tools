import { useMemo, useState } from 'react';

function fmt(n, digits = 2) {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toFixed(digits);
}

function fmtCoord(roi) {
  if (!roi) return '—';
  return `${roi.x},${roi.y} ${roi.width}×${roi.height}`;
}

const COLUMNS = [
  { key: 'pairId', label: 'Pair ID', sort: (a, b) => a.index - b.index },
  { key: 'targetLabel', label: 'Target Label', sort: (a, b) => (a.target?.displayName ?? '').localeCompare(b.target?.displayName ?? '') },
  { key: 'controlLabel', label: 'Control Label', sort: (a, b) => (a.control?.displayName ?? '').localeCompare(b.control?.displayName ?? '') },
  {
    key: 'targetIntDen',
    label: 'Target IntDen',
    sort: (a, b) => (a.target?.measurements?.intDenInner ?? 0) - (b.target?.measurements?.intDenInner ?? 0),
    render: (p) => fmt(p.target?.measurements?.intDenInner, 1),
  },
  {
    key: 'controlIntDen',
    label: 'Control IntDen',
    sort: (a, b) => (a.control?.measurements?.intDenInner ?? 0) - (b.control?.measurements?.intDenInner ?? 0),
    render: (p) => fmt(p.control?.measurements?.intDenInner, 1),
  },
  {
    key: 'targetCorrected',
    label: 'Target Corrected',
    sort: (a, b) => (a.targetCorrected ?? 0) - (b.targetCorrected ?? 0),
    render: (p) => fmt(p.targetCorrected, 2),
  },
  {
    key: 'controlCorrected',
    label: 'Control Corrected',
    sort: (a, b) => (a.controlCorrected ?? 0) - (b.controlCorrected ?? 0),
    render: (p) => fmt(p.controlCorrected, 2),
  },
  {
    key: 'ratio',
    label: 'Ratio',
    sort: (a, b) => (a.ratio ?? 0) - (b.ratio ?? 0),
    render: (p) => fmt(p.ratio, 4),
  },
  {
    key: 'targetInner',
    label: 'Target Inner',
    render: (p) => fmtCoord(p.target?.innerROI),
  },
  {
    key: 'targetOuter',
    label: 'Target Outer',
    render: (p) => fmtCoord(p.target?.outerROI),
  },
  {
    key: 'targetArea',
    label: 'Target Area',
    render: (p) => p.target?.measurements?.areaInner ?? '—',
  },
  {
    key: 'targetMean',
    label: 'Target Mean',
    render: (p) => fmt(p.target?.measurements?.meanInner, 3),
  },
  {
    key: 'controlInner',
    label: 'Control Inner',
    render: (p) => fmtCoord(p.control?.innerROI),
  },
  {
    key: 'controlOuter',
    label: 'Control Outer',
    render: (p) => fmtCoord(p.control?.outerROI),
  },
  {
    key: 'controlArea',
    label: 'Control Area',
    render: (p) => p.control?.measurements?.areaInner ?? '—',
  },
  {
    key: 'controlMean',
    label: 'Control Mean',
    render: (p) => fmt(p.control?.measurements?.meanInner, 3),
  },
];

export default function DataTable({
  pairs,
  averagedRatio,
  activeRoiId,
  onSelectRoi,
  onUserLabelChange,
}) {
  const [sortKey, setSortKey] = useState('pairId');
  const [sortDir, setSortDir] = useState(1);
  const [showIncomplete, setShowIncomplete] = useState(true);

  const filtered = useMemo(() => {
    if (showIncomplete) return pairs;
    return pairs.filter((p) => p.complete);
  }, [pairs, showIncomplete]);

  const sorted = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sortKey);
    if (!col?.sort) return filtered;
    return [...filtered].sort((a, b) => col.sort(a, b) * sortDir);
  }, [filtered, sortKey, sortDir]);

  const handleSort = (key) => {
    const col = COLUMNS.find((c) => c.key === key);
    if (!col?.sort) return;
    if (sortKey === key) {
      setSortDir((d) => -d);
    } else {
      setSortKey(key);
      setSortDir(1);
    }
  };

  if (pairs.length === 0) {
    return (
      <div className="gq-data-table gq-data-table--empty">
        <p>No pairs yet. In Image View, click Target then Control to create paired measurements.</p>
      </div>
    );
  }

  return (
    <div className="gq-data-table">
      <div className="gq-data-table__header">
        <div>
          <h2 className="gq-data-table__title">Data Table</h2>
          <span className="gq-data-table__meta">
            {filtered.length} row{filtered.length !== 1 ? 's' : ''}
            {averagedRatio != null && ` · Averaged ratio ${fmt(averagedRatio, 4)}`}
          </span>
        </div>
        <label className="gq-data-table__filter">
          <input
            type="checkbox"
            checked={showIncomplete}
            onChange={(e) => setShowIncomplete(e.target.checked)}
          />
          Show incomplete pairs
        </label>
      </div>
      <div className="gq-data-table__scroll">
        <table className="gq-data-table__table">
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th key={col.key}>
                  {col.sort ? (
                    <button
                      type="button"
                      className={`gq-data-table__sort${sortKey === col.key ? ' gq-data-table__sort--active' : ''}`}
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                      {sortKey === col.key && (sortDir > 0 ? ' ↑' : ' ↓')}
                    </button>
                  ) : (
                    <span className="gq-data-table__th-static">{col.label}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((pair) => {
              const activeInPair =
                pair.target?.id === activeRoiId || pair.control?.id === activeRoiId;

              return (
                <tr
                  key={pair.id}
                  className={[
                    activeInPair ? 'gq-data-table__row--active' : '',
                    pair.complete ? '' : 'gq-data-table__row--pending',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <td>{pair.name}</td>
                  <td>
                    {pair.target ? (
                      <input
                        type="text"
                        className="gq-data-table__input"
                        placeholder={pair.target.name}
                        value={pair.target.userLabel}
                        onChange={(e) => onUserLabelChange(pair.target.id, e.target.value)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRoi(pair.target.id);
                        }}
                      />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {pair.control ? (
                      <input
                        type="text"
                        className="gq-data-table__input"
                        placeholder={pair.control.name}
                        value={pair.control.userLabel}
                        onChange={(e) => onUserLabelChange(pair.control.id, e.target.value)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRoi(pair.control.id);
                        }}
                      />
                    ) : (
                      '—'
                    )}
                  </td>
                  {COLUMNS.slice(3).map((col) => (
                    <td key={col.key}>{col.render(pair)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
