export default function FilterBar({
  samples,
  targets,
  selectedSample,
  selectedTarget,
  onSampleChange,
  onTargetChange,
  hideNTC,
  onHideNTCChange,
  hideUndetermined,
  onHideUndeterminedChange,
  showOutliersOnly,
  onOutliersOnlyChange,
  variant = 'raw',
}) {
  return (
    <div className="filter-bar">
      <label className="filter-select">
        <span className="filter-label">Filter by sample:</span>
        <select value={selectedSample} onChange={(e) => onSampleChange(e.target.value)}>
          <option value="">All</option>
          {samples.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-select">
        <span className="filter-label">Filter by target:</span>
        <select value={selectedTarget} onChange={(e) => onTargetChange(e.target.value)}>
          <option value="">All</option>
          {targets.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      {variant === 'raw' && (
        <>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={hideNTC}
              onChange={(e) => onHideNTCChange(e.target.checked)}
            />
            Hide NTC
          </label>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={hideUndetermined}
              onChange={(e) => onHideUndeterminedChange(e.target.checked)}
            />
            Hide Undetermined
          </label>
        </>
      )}
      {variant === 'averaged' && showOutliersOnly !== undefined && (
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={showOutliersOnly}
            onChange={(e) => onOutliersOnlyChange(e.target.checked)}
          />
          Outliers only
        </label>
      )}
    </div>
  );
}
