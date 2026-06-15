export default function Sparkline({ values, mean }) {
  if (!values?.length) {
    return <span className="qi-sparkline-empty">—</span>;
  }

  const min = Math.min(...values, mean ?? values[0]);
  const max = Math.max(...values, mean ?? values[0]);
  const range = max - min || 1;
  const toX = (v) => 4 + ((v - min) / range) * 72;

  return (
    <svg className="qi-sparkline" width="80" height="16" aria-hidden>
      {mean != null && (
        <line
          x1={toX(mean)}
          y1="2"
          x2={toX(mean)}
          y2="14"
          stroke="var(--qi-accent)"
          strokeWidth="1.5"
        />
      )}
      {values.map((v, i) => (
        <circle key={i} cx={toX(v)} cy="8" r="2.5" fill="var(--qi-text-muted)" />
      ))}
    </svg>
  );
}
