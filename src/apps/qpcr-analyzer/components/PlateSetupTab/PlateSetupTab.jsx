import WellGrid from './WellGrid';
import WellInfoPanel from './WellInfoPanel';

export default function PlateSetupTab({
  experiment,
  colorBy,
  setColorBy,
  targetColors,
  sampleColors,
  selectedWells,
  omittedWells,
  onWellClick,
  onToggleOmit,
}) {
  const legendItems =
    colorBy === 'target'
      ? experiment.targets.map((t) => ({ name: t, color: targetColors[t] }))
      : experiment.samples.map((s) => ({ name: s, color: sampleColors[s] }));

  return (
    <div className="tab-panel plate-setup">
      <div className="plate-setup__toolbar">
        <label className="plate-setup__color-by">
          Color by:
          <select
            value={colorBy}
            onChange={(e) => setColorBy(e.target.value)}
          >
            <option value="target">Target</option>
            <option value="sample">Sample</option>
          </select>
        </label>
        <div className="plate-setup__legend">
          {legendItems.map((item) => (
            <span key={item.name} className="legend-item">
              <span
                className="legend-swatch"
                style={{ background: item.color }}
              />
              {item.name}
            </span>
          ))}
        </div>
      </div>

      <WellGrid
        wells={experiment.wells}
        colorBy={colorBy}
        targetColors={targetColors}
        sampleColors={sampleColors}
        selectedWells={selectedWells}
        omittedWells={omittedWells}
        onWellClick={onWellClick}
      />

      <WellInfoPanel
        wells={experiment.wells}
        selectedWells={selectedWells}
        omittedWells={omittedWells}
        onToggleOmit={onToggleOmit}
      />
    </div>
  );
}
