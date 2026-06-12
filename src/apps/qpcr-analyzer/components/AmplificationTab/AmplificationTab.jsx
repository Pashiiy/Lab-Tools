import AmpChart from './AmpChart';
import WellSelectorPanel from './WellSelectorPanel';

const DISPLAY_MODES = ['ΔRn', 'Rn', 'Log ΔRn'];

export default function AmplificationTab({
  experiment,
  activeTarget,
  setActiveTarget,
  displayMode,
  setDisplayMode,
  thresholds,
  setThreshold,
  defaultThresholds,
  onAutoThreshold,
  liveCts,
  sampleColors,
  omittedWells,
  chartHighlightedWells,
  onToggleOmit,
  onSelectAllWells,
  onClearChartSelection,
}) {
  if (!experiment) {
    return (
      <div className="tab-panel tab-placeholder">
        <p>Load an experiment file to view amplification curves.</p>
      </div>
    );
  }

  const threshold = thresholds[activeTarget] ?? 0.2;

  return (
    <div className="tab-panel amp-tab">
      <div className="amp-toolbar">
        <div className="amp-target-pills">
          <span className="amp-toolbar-label">Target:</span>
          {experiment.targets.map((t) => (
            <button
              key={t}
              type="button"
              className={`target-pill${activeTarget === t ? ' target-pill--active' : ''}`}
              onClick={() => setActiveTarget(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="amp-display-modes">
          <span className="amp-toolbar-label">Display:</span>
          {DISPLAY_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              className={`display-mode-btn${displayMode === mode ? ' display-mode-btn--active' : ''}`}
              onClick={() => setDisplayMode(mode)}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="amp-layout">
        <AmpChart
          experiment={experiment}
          activeTarget={activeTarget}
          displayMode={displayMode}
          threshold={threshold}
          onThresholdChange={(v) => setThreshold(activeTarget, v)}
          sampleColors={sampleColors}
          chartHighlightedWells={chartHighlightedWells}
          omittedWells={omittedWells}
        />
        <WellSelectorPanel
          wells={experiment.wells}
          activeTarget={activeTarget}
          liveCts={liveCts}
          sampleColors={sampleColors}
          omittedWells={omittedWells}
          chartHighlightedWells={chartHighlightedWells}
          threshold={threshold}
          onThresholdChange={(v) => setThreshold(activeTarget, v)}
          onAutoThreshold={onAutoThreshold}
          onToggleOmit={onToggleOmit}
          onSelectAll={onSelectAllWells}
          onClearSelection={onClearChartSelection}
        />
      </div>
    </div>
  );
}
