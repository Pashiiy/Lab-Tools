import { calcCFU } from '../utils/cfu';
import SciNotation from './SciNotation';

const PRESET_EXPONENTS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function CFUCalculator({
  colonyCount,
  categories,
  categoryCounts,
  dilutionMode,
  setDilutionMode,
  dilutionExponent,
  setDilutionExponent,
  customDilution,
  setCustomDilution,
  volumeMl,
  setVolumeMl,
}) {
  const dilutionFactor =
    dilutionMode === 'custom'
      ? parseFloat(customDilution)
      : Math.pow(10, -dilutionExponent);

  const totalCFU = calcCFU(colonyCount, dilutionFactor, volumeMl);

  return (
    <section className="sidebar__section cfu-panel">
      <h3 className="sidebar__heading">CFU/mL Calculator</h3>

      <label className="sidebar__label">Dilution factor</label>
      <div className="cfu-dilution-picker">
        {PRESET_EXPONENTS.map((exp) => (
          <button
            key={exp}
            type="button"
            className={`cfu-dilution-btn${dilutionMode === 'preset' && dilutionExponent === exp ? ' cfu-dilution-btn--active' : ''}`}
            onClick={() => {
              setDilutionMode('preset');
              setDilutionExponent(exp);
            }}
          >
            10<sup>−{exp}</sup>
          </button>
        ))}
        <button
          type="button"
          className={`cfu-dilution-btn${dilutionMode === 'custom' ? ' cfu-dilution-btn--active' : ''}`}
          onClick={() => setDilutionMode('custom')}
        >
          Custom
        </button>
      </div>

      {dilutionMode === 'custom' && (
        <input
          type="number"
          className="cfu-input"
          placeholder="e.g. 0.001"
          step="any"
          min="0"
          value={customDilution}
          onChange={(e) => setCustomDilution(e.target.value)}
        />
      )}

      <label className="sidebar__label">Volume plated (mL)</label>
      <input
        type="number"
        className="cfu-input"
        step="0.01"
        min="0.001"
        value={volumeMl}
        onChange={(e) => setVolumeMl(Number(e.target.value))}
      />

      <div className="cfu-result">
        <span className="cfu-result__label">CFU/mL:</span>
        <span className="cfu-result__value">
          <SciNotation value={totalCFU} />
        </span>
      </div>

      <p className="cfu-note">Based on {colonyCount} total colonies</p>

      {categories.length > 1 && totalCFU !== null && (
        <ul className="cfu-breakdown">
          {categories.map((cat) => {
            const count = categoryCounts[cat.id] ?? 0;
            const cfu = calcCFU(count, dilutionFactor, volumeMl);
            return (
              <li key={cat.id} className="cfu-breakdown__item">
                <span className="cfu-breakdown__dot" style={{ backgroundColor: cat.color }} />
                <span className="cfu-breakdown__name">{cat.label}</span>
                <span className="cfu-breakdown__value">
                  <SciNotation value={cfu} />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
