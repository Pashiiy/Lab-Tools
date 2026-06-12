import RunEventTimeline from './RunEventTimeline';

function formatTimestamp(ms) {
  if (ms == null) return '—';
  const d = new Date(typeof ms === 'number' ? ms : parseInt(ms, 10));
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function formatDuration(start, end) {
  if (start == null || end == null) return '—';
  const diff = end - start;
  if (diff < 0) return '—';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function InfoCard({ title, children }) {
  return (
    <div className="info-card">
      <h3 className="info-card__title">{title}</h3>
      <dl className="info-card__list">{children}</dl>
    </div>
  );
}

function InfoRow({ label, value, badge }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>
        {badge ? (
          <span className={`status-badge status-badge--${badge}`}>{value}</span>
        ) : (
          value
        )}
      </dd>
    </>
  );
}

export default function RunSummaryTab({ experiment }) {
  const { summary, runSummary, plateSetup, analysisSetting, targets, samples } =
    experiment;

  const status = summary?.status || runSummary?.status || 'UNKNOWN';
  const statusBadge =
    /complete|success/i.test(status)
      ? 'success'
      : /fail/i.test(status)
        ? 'error'
        : 'neutral';

  const startTime = runSummary?.startTime ?? summary?.startTime;
  const endTime = runSummary?.endTime ?? summary?.endTime;

  return (
    <div className="tab-panel run-summary">
      <div className="info-cards">
        <InfoCard title="Instrument">
          <InfoRow
            label="Type"
            value={summary?.instrumentType || runSummary?.instrumentType || 'QuantStudio™ System'}
          />
          <InfoRow
            label="Serial Number"
            value={runSummary?.instrumentSerialNumber || '—'}
          />
          <InfoRow label="Block Type" value="96-well, 0.2mL" />
          <InfoRow
            label="Block Serial"
            value={runSummary?.blockSerialNumber || '—'}
          />
          <InfoRow
            label="Firmware"
            value={runSummary?.firmwareVersion || '—'}
          />
        </InfoCard>

        <InfoCard title="Run">
          <InfoRow label="Status" value={status} badge={statusBadge} />
          <InfoRow label="Start Time" value={formatTimestamp(startTime)} />
          <InfoRow label="End Time" value={formatTimestamp(endTime)} />
          <InfoRow
            label="Duration"
            value={formatDuration(startTime, endTime)}
          />
          <InfoRow
            label="Run Mode"
            value={runSummary?.runMode || summary?.runMode || 'STANDARD'}
          />
        </InfoCard>

        <InfoCard title="Experiment">
          <InfoRow label="Name" value={summary?.name || experiment.experimentName} />
          <InfoRow
            label="Regulatory Label"
            value={summary?.regulatoryLabel || '—'}
          />
          <InfoRow
            label="Passive Reference"
            value={plateSetup?.passiveReference || '—'}
          />
          <InfoRow label="Targets" value={targets.join(', ') || '—'} />
          <InfoRow label="Samples" value={String(samples.length)} />
        </InfoCard>

        <InfoCard title="Analysis">
          <InfoRow
            label="Algorithm"
            value={
              summary?.analysis?.primary
                ? `${summary.analysis.primary.id || 'Primary'} v${summary.analysis.primary.version || '?'}`
                : '—'
            }
          />
          <InfoRow
            label="Cq Algorithm"
            value={analysisSetting?.cqAlgorithmType || 'CT'}
          />
          <InfoRow
            label="Analysis Status"
            value={summary?.analysis?.primary?.status || '—'}
          />
          <InfoRow
            label="Analysis Time"
            value={formatTimestamp(summary?.analysis?.primary?.analysisTime)}
          />
        </InfoCard>
      </div>

      <div className="run-events-section">
        <h3 className="section-title">Run Events</h3>
        <RunEventTimeline events={runSummary?.runEvents} />
      </div>
    </div>
  );
}
