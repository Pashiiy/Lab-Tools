import EmptyState from '../EmptyState';
import { formatDuration, formatEpochTime } from '../../utils/experimentStats';

function InfoCard({ label, children }) {
  return (
    <div className="qi-info-card">
      <span className="qi-info-card__label">{label}</span>
      <div className="qi-info-card__value">{children}</div>
    </div>
  );
}

export default function RunInfoSection({ runInfo, source }) {
  if (!runInfo) {
    return (
      <section className="qi-card">
        <h3 className="qi-section-title">Run Info</h3>
        <EmptyState
          icon="⏱"
          message="Run details aren't available for Excel imports. Upload the .eds file for full run information."
        />
      </section>
    );
  }

  const statusOk = /complete|success|finished/i.test(String(runInfo.status || ''));

  return (
    <section className="qi-card">
      <h3 className="qi-section-title">Run Info</h3>
      <div className="qi-info-grid">
        <InfoCard label="Instrument">
          <div>{runInfo.instrumentType}</div>
          {runInfo.serialNumber && (
            <div className="qi-text-muted qi-mono">S/N {runInfo.serialNumber}</div>
          )}
          {runInfo.firmwareVersion && (
            <div className="qi-text-muted">FW {runInfo.firmwareVersion}</div>
          )}
        </InfoCard>
        <InfoCard label="Run">
          <span
            className={`qi-status-badge${statusOk ? ' qi-status-badge--ok' : ' qi-status-badge--warn'}`}
          >
            {runInfo.status || 'Unknown'}
          </span>
          <div className="qi-text-muted">{formatEpochTime(runInfo.startTime)}</div>
          <div className="qi-text-muted">→ {formatEpochTime(runInfo.endTime)}</div>
          <div className="qi-mono">
            Duration: {formatDuration(runInfo.startTime, runInfo.endTime)}
          </div>
        </InfoCard>
        <InfoCard label="Analysis">
          <div>Passive ref: {runInfo.passiveReference || '—'}</div>
          <div>Run mode: {runInfo.runMode || '—'}</div>
          <div className="qi-text-muted">Source: {source}</div>
        </InfoCard>
      </div>
    </section>
  );
}
