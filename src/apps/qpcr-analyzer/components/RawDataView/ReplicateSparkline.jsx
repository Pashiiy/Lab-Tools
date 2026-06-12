export default function ReplicateSparkline({ ctValues, meanCt, color = '#58A6FF' }) {
  if (!ctValues || ctValues.length === 0) {
    return <span className="sparkline-empty">—</span>;
  }

  const width = 80;
  const height = 16;
  const padding = 4;
  const min = Math.min(...ctValues) - 0.5;
  const max = Math.max(...ctValues) + 0.5;
  const range = max - min || 1;

  const xForCt = (ct) =>
    padding + ((ct - min) / range) * (width - padding * 2);

  const meanY = height / 2;

  return (
    <svg width={width} height={height} className="sparkline">
      {meanCt !== null && meanCt !== undefined && (
        <line
          x1={xForCt(meanCt)}
          y1={2}
          x2={xForCt(meanCt)}
          y2={height - 2}
          stroke={color}
          strokeWidth={1}
          strokeOpacity={0.5}
        />
      )}
      {ctValues.map((ct, i) => (
        <circle
          key={i}
          cx={xForCt(ct)}
          cy={meanY}
          r={3}
          fill={color}
          opacity={0.85}
        />
      ))}
    </svg>
  );
}
