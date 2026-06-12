function formatTimestamp(ms) {
  if (ms == null) return '—';
  const d = new Date(typeof ms === 'number' ? ms : parseInt(ms, 10));
  if (Number.isNaN(d.getTime())) return String(ms);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export default function RunEventTimeline({ events }) {
  if (!events?.length) {
    return <p className="timeline-empty">No run events recorded.</p>;
  }

  return (
    <div className="run-timeline">
      {events.map((event, i) => (
        <div key={i} className="run-timeline__item">
          <span className="run-timeline__dot">●</span>
          <span className="run-timeline__time mono">
            {formatTimestamp(event.timestamp ?? event.time ?? event.eventTime)}
          </span>
          <span className="run-timeline__desc">
            {event.description ?? event.eventType ?? event.name ?? 'Event'}
          </span>
        </div>
      ))}
    </div>
  );
}
