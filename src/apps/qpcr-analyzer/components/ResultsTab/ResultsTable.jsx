import { Fragment, useMemo, useState } from 'react';

function AmpBadge({ status }) {
  if (!status) return '—';
  if (/^amp$/i.test(String(status).trim())) {
    return <span className="amp-yes">AMP</span>;
  }
  if (/no/i.test(String(status))) {
    return <span className="amp-no">NO_AMP</span>;
  }
  return status;
}

function FlagBadges({ flags }) {
  if (!flags?.length) return '—';
  return (
    <span className="flag-group">
      {flags.map((f) => (
        <span key={f} className="flag flag-qc">
          {f}
        </span>
      ))}
    </span>
  );
}

function replicateStats(ctValues) {
  const n = ctValues.length;
  if (n === 0) return { mean: null, sd: null, n: 0 };
  const mean = ctValues.reduce((a, b) => a + b, 0) / n;
  const sd =
    n > 1
      ? Math.sqrt(ctValues.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1))
      : null;
  return { mean, sd, n };
}

export default function ResultsTable({
  experiment,
  liveCtLookup,
  omittedWells,
  onToggleOmit,
  filterTarget = '',
  filterSample = '',
  showOmitted = false,
  flaggedOnly = false,
}) {
  const [sortKey, setSortKey] = useState('well');
  const [sortDir, setSortDir] = useState(1);

  const rows = useMemo(() => {
    const out = [];
    experiment.wells.forEach((well) => {
      well.reactions.forEach((r) => {
        const omitKey = `${well.index}-${r.targetName}`;
        const liveCt = liveCtLookup[omitKey] ?? r.cq;
        out.push({
          wellIndex: well.index,
          position: well.position,
          sampleName: well.sampleName,
          task: r.task,
          targetName: r.targetName,
          liveCt,
          cqConf: r.cqConf,
          ampStatus: r.ampStatus,
          ampScore: r.ampScore,
          flags: r.flags ?? [],
          omitted: omittedWells.has(omitKey) || r.omitted,
          omitKey,
        });
      });
    });
    return out;
  }, [experiment, liveCtLookup, omittedWells]);

  const filtered = useMemo(() => {
    let list = rows.filter((row) => {
      if (filterTarget && row.targetName !== filterTarget) return false;
      if (filterSample && row.sampleName !== filterSample) return false;
      if (!showOmitted && row.omitted) return false;
      if (flaggedOnly && row.flags.length === 0) return false;
      return true;
    });

    list.sort((a, b) => {
      let av;
      let bv;
      switch (sortKey) {
        case 'well':
          av = a.wellIndex;
          bv = b.wellIndex;
          break;
        case 'sample':
          av = a.sampleName;
          bv = b.sampleName;
          break;
        case 'target':
          av = a.targetName;
          bv = b.targetName;
          break;
        case 'ct':
          av = a.liveCt ?? 999;
          bv = b.liveCt ?? 999;
          break;
        default:
          av = a[sortKey];
          bv = b[sortKey];
      }
      if (av < bv) return -sortDir;
      if (av > bv) return sortDir;
      return 0;
    });

    return list;
  }, [rows, filterTarget, filterSample, showOmitted, flaggedOnly, sortKey, sortDir]);

  const grouped = useMemo(() => {
    const groups = [];
    let currentKey = null;
    let currentRows = [];

    filtered.forEach((row) => {
      const key = `${row.sampleName}||${row.targetName}`;
      if (key !== currentKey) {
        if (currentRows.length) groups.push({ key: currentKey, rows: currentRows });
        currentKey = key;
        currentRows = [row];
      } else {
        currentRows.push(row);
      }
    });
    if (currentRows.length) groups.push({ key: currentKey, rows: currentRows });
    return groups;
  }, [filtered]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => -d);
    else {
      setSortKey(key);
      setSortDir(1);
    }
  };

  const sortIndicator = (key) => (sortKey === key ? (sortDir > 0 ? ' ↑' : ' ↓') : '');

  return (
    <div className="results-table-wrap">
      <table className="data-table results-table">
        <thead>
          <tr>
            <th onClick={() => toggleSort('well')}>Well{sortIndicator('well')}</th>
            <th onClick={() => toggleSort('sample')}>Sample{sortIndicator('sample')}</th>
            <th>Task</th>
            <th onClick={() => toggleSort('target')}>Target{sortIndicator('target')}</th>
            <th onClick={() => toggleSort('ct')}>Ct (live){sortIndicator('ct')}</th>
            <th>Cq Conf</th>
            <th>Amp Status</th>
            <th>Amp Score</th>
            <th>Flags</th>
            <th>Omit</th>
          </tr>
        </thead>
        <tbody>
          {grouped.map((group) => {
            const nonOmittedCts = group.rows
              .filter((r) => !r.omitted && r.liveCt !== null)
              .map((r) => r.liveCt);
            const stats = replicateStats(nonOmittedCts);

            return (
              <Fragment key={group.key}>
                {group.rows.map((row) => (
                  <tr
                    key={row.omitKey}
                    className={row.omitted ? 'row-omitted' : ''}
                  >
                    <td className="mono">{row.position}</td>
                    <td>{row.sampleName || '—'}</td>
                    <td>{row.task || '—'}</td>
                    <td>{row.targetName}</td>
                    <td
                      className={`mono${row.liveCt === null ? ' ct-undef' : ''}${row.omitted ? ' strikethrough' : ''}`}
                    >
                      {row.liveCt !== null ? row.liveCt.toFixed(3) : 'Undetermined'}
                    </td>
                    <td
                      className={`mono${row.cqConf !== null && row.cqConf < 0.8 ? ' val-warning' : ''}`}
                    >
                      {row.cqConf !== null ? row.cqConf.toFixed(3) : '—'}
                    </td>
                    <td>
                      <AmpBadge status={row.ampStatus} />
                    </td>
                    <td
                      className={`mono${row.ampScore !== null && row.ampScore < 1 ? ' val-warning' : ''}`}
                    >
                      {row.ampScore !== null ? row.ampScore.toFixed(2) : '—'}
                    </td>
                    <td>
                      <FlagBadges flags={row.flags} />
                    </td>
                    <td>
                      <label className="omit-switch">
                        <input
                          type="checkbox"
                          checked={row.omitted}
                          onChange={() =>
                            onToggleOmit(row.wellIndex, row.targetName)
                          }
                        />
                      </label>
                    </td>
                  </tr>
                ))}
                {group.rows.length > 1 && (
                  <tr className="replicate-summary-row">
                    <td colSpan={4}>
                      Mean Ct ± SD ({stats.n} replicates)
                    </td>
                    <td className="mono" colSpan={6}>
                      {stats.mean !== null
                        ? `${stats.mean.toFixed(3)} ± ${stats.sd !== null ? stats.sd.toFixed(3) : '—'}`
                        : '—'}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
