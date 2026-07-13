import CategoryPanel from './CategoryPanel';
import CFUCalculator from './CFUCalculator';

export default function Sidebar({
  colonyCount,
  categories,
  activeCategory,
  categoryCounts,
  dots,
  onSelectCategory,
  onUpdateCategoryLabel,
  onUpdateCategoryColor,
  onAddCategory,
  onDeleteCategory,
  dilutionMode,
  setDilutionMode,
  dilutionExponent,
  setDilutionExponent,
  customDilution,
  setCustomDilution,
  volumeMl,
  setVolumeMl,
  dotRadius,
  setDotRadius,
  opacity,
  setOpacity,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  hasImage,
  plateMeta,
  onPlateMetaChange,
  plateCount = 0,
}) {
  const disabled = !hasImage;
  const meta = plateMeta || {};

  return (
    <aside className="sidebar">
      <section className="sidebar__section count-panel">
        <div className="count-panel__total">
          <span className="count-panel__number">{colonyCount}</span>
          <span className="count-panel__label">
            {colonyCount === 1 ? 'colony' : 'colonies'}
            {plateCount > 1 ? ' on this plate' : ' total'}
          </span>
        </div>
        {categories.length > 0 && (
          <ul className="count-breakdown">
            {categories.map((cat) => (
              <li key={cat.id} className="count-breakdown__item">
                <span
                  className="count-breakdown__dot"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="count-breakdown__name">{cat.label}</span>
                <span className="count-breakdown__count">
                  {categoryCounts[cat.id] ?? 0}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {hasImage && (
        <section className="sidebar__section cc-plate-meta" data-tour="cc-metadata">
          <h3 className="sidebar__heading">Plate metadata</h3>
          <label className="sidebar__label">
            Sample name
            <input
              type="text"
              className="lt-input"
              value={meta.sampleName || ''}
              disabled={disabled}
              onChange={(e) => onPlateMetaChange?.({ sampleName: e.target.value })}
            />
          </label>
          <label className="sidebar__label">
            Strain
            <input
              type="text"
              className="lt-input"
              value={meta.strain || ''}
              disabled={disabled}
              onChange={(e) => onPlateMetaChange?.({ strain: e.target.value })}
            />
          </label>
          <label className="sidebar__label">
            Treatment
            <input
              type="text"
              className="lt-input"
              value={meta.treatment || ''}
              disabled={disabled}
              onChange={(e) => onPlateMetaChange?.({ treatment: e.target.value })}
            />
          </label>
          <div className="cc-plate-meta__row">
            <label className="sidebar__label">
              Time point
              <input
                type="text"
                className="lt-input"
                value={meta.timePoint || ''}
                disabled={disabled}
                onChange={(e) => onPlateMetaChange?.({ timePoint: e.target.value })}
              />
            </label>
            <label className="sidebar__label">
              Replicate
              <input
                type="text"
                className="lt-input"
                value={meta.replicate || ''}
                disabled={disabled}
                onChange={(e) => onPlateMetaChange?.({ replicate: e.target.value })}
              />
            </label>
          </div>
          <label className="sidebar__label">
            Date
            <input
              type="date"
              className="lt-input"
              value={meta.date || ''}
              disabled={disabled}
              onChange={(e) => onPlateMetaChange?.({ date: e.target.value })}
            />
          </label>
          <label className="sidebar__label">
            Notes
            <textarea
              className="lt-input cc-plate-meta__notes"
              rows={2}
              value={meta.notes || ''}
              disabled={disabled}
              onChange={(e) => onPlateMetaChange?.({ notes: e.target.value })}
            />
          </label>
        </section>
      )}

      <CFUCalculator
        colonyCount={colonyCount}
        categories={categories}
        categoryCounts={categoryCounts}
        dilutionMode={dilutionMode}
        setDilutionMode={setDilutionMode}
        dilutionExponent={dilutionExponent}
        setDilutionExponent={setDilutionExponent}
        customDilution={customDilution}
        setCustomDilution={setCustomDilution}
        volumeMl={volumeMl}
        setVolumeMl={setVolumeMl}
      />

      <CategoryPanel
        categories={categories}
        activeCategory={activeCategory}
        categoryCounts={categoryCounts}
        onSelectCategory={onSelectCategory}
        onUpdateLabel={onUpdateCategoryLabel}
        onUpdateColor={onUpdateCategoryColor}
        onAddCategory={onAddCategory}
        onDeleteCategory={onDeleteCategory}
        dots={dots}
      />

      <section className="sidebar__section">
        <label className="sidebar__label">Radius: {dotRadius}px</label>
        <input
          type="range"
          className="sidebar__slider"
          min={2}
          max={40}
          value={dotRadius}
          onChange={(e) => setDotRadius(Number(e.target.value))}
        />
      </section>

      <section className="sidebar__section">
        <label className="sidebar__label">
          Opacity: {Math.round(opacity * 100)}%
        </label>
        <input
          type="range"
          className="sidebar__slider"
          min={20}
          max={100}
          value={Math.round(opacity * 100)}
          onChange={(e) => setOpacity(Number(e.target.value) / 100)}
        />
      </section>

      <section className="sidebar__section sidebar__actions">
        <div className="sidebar__btn-group">
          <button
            type="button"
            className="lt-btn"
            onClick={onUndo}
            disabled={disabled || !canUndo}
          >
            ← Undo
          </button>
          <button
            type="button"
            className="lt-btn"
            onClick={onRedo}
            disabled={disabled || !canRedo}
          >
            Redo →
          </button>
        </div>
        <p className="sidebar__hint">Ctrl+Z / Ctrl+Y · ← → plates</p>
      </section>
    </aside>
  );
}
