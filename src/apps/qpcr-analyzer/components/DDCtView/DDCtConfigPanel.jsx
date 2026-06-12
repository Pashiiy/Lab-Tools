export default function DDCtConfigPanel({
  uniqueTargets,
  uniqueSamples,
  referenceGene,
  controlSample,
  onReferenceChange,
  onControlChange,
}) {
  return (
    <div className="ddct-config">
      <label className="ddct-config__field">
        <span className="ddct-config__label">Reference gene (housekeeping):</span>
        <select
          value={referenceGene}
          onChange={(e) => onReferenceChange(e.target.value)}
        >
          <option value="">Select…</option>
          {uniqueTargets.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className="ddct-config__field">
        <span className="ddct-config__label">Control sample:</span>
        <select
          value={controlSample}
          onChange={(e) => onControlChange(e.target.value)}
        >
          <option value="">Select…</option>
          {uniqueSamples.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
