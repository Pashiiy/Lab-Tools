import { toggleSetItem } from '../../utils/workspaceFilters';

function MultiSelectList({ items, selected, onChange, allLabel = 'All' }) {
  const allSelected = selected.size === 0;

  const toggleAll = () => onChange(new Set());

  const toggleItem = (item) => {
    if (allSelected) {
      onChange(new Set([item]));
      return;
    }
    const next = toggleSetItem(selected, item);
    if (next.size === items.length) onChange(new Set());
    else onChange(next);
  };

  return (
    <div className="ws-filter-list">
      <label className="ws-filter-item">
        <input type="checkbox" checked={allSelected} onChange={toggleAll} />
        <span>{allLabel}</span>
      </label>
      {items.map((item) => (
        <label key={item} className="ws-filter-item">
          <input
            type="checkbox"
            checked={allSelected || selected.has(item)}
            onChange={() => toggleItem(item)}
          />
          <span title={item}>{item}</span>
        </label>
      ))}
    </div>
  );
}

export default function FilterSidebar({
  samples,
  targets,
  filterSamples,
  setFilterSamples,
  filterTargets,
  setFilterTargets,
  displayOptions,
  setDisplayOptions,
  chartColorBy,
  setChartColorBy,
  plateColorBy,
  setPlateColorBy,
  hasMelt,
  hasStandardCurve,
  activeTarget,
  setActiveTarget,
  thresholds,
  setThreshold,
  onAutoThreshold,
}) {
  const sampleList = [
    ...samples,
    ...(samples.length ? [] : []),
  ];

  const toggleDisplay = (key) => {
    setDisplayOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside className="ws-sidebar">
      <div className="ws-sidebar__block">
        <h3 className="ws-sidebar__heading">Sample Filter</h3>
        <MultiSelectList
          items={sampleList}
          selected={filterSamples}
          onChange={setFilterSamples}
          allLabel="All Samples"
        />
      </div>

      <div className="ws-sidebar__block">
        <h3 className="ws-sidebar__heading">Target Filter</h3>
        <MultiSelectList
          items={targets}
          selected={filterTargets}
          onChange={setFilterTargets}
          allLabel="All Targets"
        />
      </div>

      <div className="ws-sidebar__block">
        <h3 className="ws-sidebar__heading">Display Options</h3>
        <label className="ws-filter-item">
          <input
            type="checkbox"
            checked={displayOptions.amplification}
            onChange={() => toggleDisplay('amplification')}
          />
          Amplification Curves
        </label>
        {hasMelt && (
          <label className="ws-filter-item">
            <input
              type="checkbox"
              checked={displayOptions.melt}
              onChange={() => toggleDisplay('melt')}
            />
            Melt Curves
          </label>
        )}
        {hasStandardCurve && (
          <label className="ws-filter-item">
            <input
              type="checkbox"
              checked={displayOptions.standardCurve}
              onChange={() => toggleDisplay('standardCurve')}
            />
            Standard Curve
          </label>
        )}
        <label className="ws-filter-item">
          <input
            type="checkbox"
            checked={displayOptions.statistics}
            onChange={() => toggleDisplay('statistics')}
          />
          Statistics
        </label>
      </div>

      <div className="ws-sidebar__block">
        <h3 className="ws-sidebar__heading">Color By (Charts)</h3>
        {['target', 'sample', 'well'].map((mode) => (
          <label key={mode} className="ws-radio">
            <input
              type="radio"
              name="chartColorBy"
              checked={chartColorBy === mode}
              onChange={() => setChartColorBy(mode)}
            />
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </label>
        ))}
      </div>

      <div className="ws-sidebar__block">
        <h3 className="ws-sidebar__heading">Color Plate By</h3>
        <select
          className="ws-select"
          value={plateColorBy}
          onChange={(e) => setPlateColorBy(e.target.value)}
        >
          <option value="target">Target</option>
          <option value="sample">Sample</option>
          <option value="wellType">Well Type</option>
          <option value="selection">Selection</option>
        </select>
      </div>

      {activeTarget && (
        <div className="ws-sidebar__block">
          <h3 className="ws-sidebar__heading">Threshold ({activeTarget})</h3>
          <input
            type="number"
            step="0.001"
            className="ws-threshold-input mono"
            value={thresholds[activeTarget] ?? 0.2}
            onChange={(e) =>
              setThreshold(activeTarget, parseFloat(e.target.value) || 0)
            }
          />
          <button type="button" className="btn-ghost ws-auto-btn" onClick={onAutoThreshold}>
            Auto threshold
          </button>
        </div>
      )}
    </aside>
  );
}
