export default function WellSelectorPanel({
  wells,
  activeTarget,
  liveCts,
  sampleColors,
  omittedWells,
  chartHighlightedWells,
  threshold,
  onThresholdChange,
  onAutoThreshold,
  onToggleOmit,
  onSelectAll,
  onClearSelection,
}) {
  const targetWells = wells
    .filter((w) => w.reactions.some((r) => r.targetName === activeTarget))
    .sort((a, b) => a.index - b.index);

  return (
    <div className="well-selector-panel">
      <div className="well-selector-panel__actions">
        <button type="button" className="btn-ghost" onClick={onSelectAll}>
          Select All
        </button>
        <button type="button" className="btn-ghost" onClick={onClearSelection}>
          Clear
        </button>
      </div>

      <div className="well-selector-list">
        {targetWells.map((well) => {
          const omitKey = `${well.index}-${activeTarget}`;
          const omitted = omittedWells.has(omitKey);
          const ct = liveCts[well.index];
          const color = sampleColors[well.sampleName] || '#888';

          return (
            <div
              key={well.index}
              className={`well-selector-row${omitted ? ' well-selector-row--omitted' : ''}${chartHighlightedWells.has(well.index) ? ' well-selector-row--highlighted' : ''}`}
            >
              <span
                className="well-selector-dot"
                style={{ background: color }}
              />
              <span className="well-selector-pos mono">{well.position}</span>
              <span className="well-selector-sample" title={well.sampleName}>
                {well.sampleName || '—'}
              </span>
              <span
                className={`well-selector-ct mono${ct === null ? ' ct-undef' : ''}${omitted ? ' strikethrough' : ''}`}
              >
                {ct !== null ? ct.toFixed(2) : 'Undetermined'}
              </span>
              <label className="well-selector-omit">
                <input
                  type="checkbox"
                  checked={omitted}
                  onChange={() => onToggleOmit(well.index, activeTarget)}
                />
              </label>
            </div>
          );
        })}
      </div>

      <div className="well-selector-threshold">
        <label className="threshold-input-label">
          Threshold
          <input
            type="number"
            step="0.001"
            min="0"
            value={threshold ?? 0.2}
            onChange={(e) => onThresholdChange(parseFloat(e.target.value) || 0)}
            className="mono threshold-input"
          />
        </label>
        <button type="button" className="btn-secondary btn-sm" onClick={onAutoThreshold}>
          Auto threshold
        </button>
      </div>
    </div>
  );
}
