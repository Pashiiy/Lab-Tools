function formatTimestamp(ms) {
  if (ms == null) return '—';
  const d = new Date(typeof ms === 'number' ? ms : parseInt(ms, 10));
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

export default function RunSummaryPanel({
  experiment,
  stats,
  visibleSeries,
  liveCtLookup,
  omittedWells,
  selectionStats,
}) {
  const { summary, runSummary, targets, samples } = experiment;
  const status = summary?.status || runSummary?.status || '—';

  return (
    <aside className="ws-summary-panel">
      <h3 className="ws-summary-panel__title">Run Summary</h3>

      <dl className="ws-summary-stats">
        <dt>Status</dt>
        <dd>
          <span
            className={`status-badge status-badge--${
              /complete|success/i.test(status) ? 'success' : /fail/i.test(status) ? 'error' : 'neutral'
            }`}
          >
            {status}
          </span>
        </dd>
        <dt>Wells (visible)</dt>
        <dd className="mono">{visibleSeries.length}</dd>
        <dt>Targets</dt>
        <dd className="mono">{stats.targets}</dd>
        <dt>Samples</dt>
        <dd className="mono">{stats.samples}</dd>
        <dt>Instrument</dt>
        <dd className="mono">{runSummary?.instrumentSerialNumber || '—'}</dd>
        <dt>Run start</dt>
        <dd className="mono">{formatTimestamp(runSummary?.startTime)}</dd>
      </dl>

      {selectionStats.length > 0 && (
        <>
          <h4 className="ws-summary-subtitle">Selection Statistics</h4>
          <div className="ws-selection-stats">
            {selectionStats.map((g) => (
              <div key={`${g.sampleName}||${g.targetName}`} className="ws-stat-group">
                <div className="ws-stat-group__label">
                  {g.sampleName || '—'} · {g.targetName}
                </div>
                <div className="ws-stat-group__values mono">
                  n={g.n}
                  {g.meanCt != null && (
                    <>
                      {' '}
                      · {g.meanCt.toFixed(3)}
                      {g.sd != null && ` ± ${g.sd.toFixed(3)}`}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <details className="ws-summary-details">
        <summary>Experiment details</summary>
        <dl className="ws-summary-stats ws-summary-stats--compact">
          <dt>Name</dt>
          <dd>{summary?.name || experiment.experimentName}</dd>
          <dt>Targets</dt>
          <dd>{targets.join(', ')}</dd>
          <dt>Passive ref</dt>
          <dd>{experiment.plateSetup?.passiveReference || '—'}</dd>
          <dt>Cq algorithm</dt>
          <dd>{experiment.analysisSetting?.cqAlgorithmType || 'CT'}</dd>
        </dl>
      </details>
    </aside>
  );
}
