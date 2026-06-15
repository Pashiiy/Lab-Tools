export default function FilterBar({
  samples,
  targets,
  sampleFilter,
  targetFilter,
  hideNtc,
  hideUndetermined,
  onSampleChange,
  onTargetChange,
  onHideNtcChange,
  onHideUndeterminedChange,
}) {
  return (
    <div className="qi-filter-bar">
      <label className="qi-filter-bar__field">
        <span>Sample</span>
        <select value={sampleFilter} onChange={(e) => onSampleChange(e.target.value)}>
          <option value="">All</option>
          {samples.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="qi-filter-bar__field">
        <span>Target</span>
        <select value={targetFilter} onChange={(e) => onTargetChange(e.target.value)}>
          <option value="">All</option>
          {targets.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className="qi-filter-bar__checkbox">
        <input
          type="checkbox"
          checked={hideNtc}
          onChange={(e) => onHideNtcChange(e.target.checked)}
        />
        Hide NTC
      </label>
      <label className="qi-filter-bar__checkbox">
        <input
          type="checkbox"
          checked={hideUndetermined}
          onChange={(e) => onHideUndeterminedChange(e.target.checked)}
        />
        Hide undetermined
      </label>
    </div>
  );
}
