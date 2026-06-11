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
  onSaveSession,
  onOpenSession,
  onExport,
  onClearAll,
  hasImage,
  remindSavePulse,
  sessionFileInputRef,
  onSessionFileSelected,
}) {
  const disabled = !hasImage;

  return (
    <aside className="sidebar">
      <input
        ref={sessionFileInputRef}
        type="file"
        accept=".colonycount,.json"
        className="session-file-input"
        onChange={onSessionFileSelected}
      />

      <section className="sidebar__section count-panel">
        <div className="count-panel__total">
          <span className="count-panel__number">{colonyCount}</span>
          <span className="count-panel__label">
            {colonyCount === 1 ? 'colony' : 'colonies'} total
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
            className="btn"
            onClick={onUndo}
            disabled={disabled || !canUndo}
          >
            ← Undo
          </button>
          <button
            className="btn"
            onClick={onRedo}
            disabled={disabled || !canRedo}
          >
            Redo →
          </button>
        </div>
        <p className="sidebar__hint">Ctrl+Z / Ctrl+Y</p>
      </section>

      <section className="sidebar__section sidebar__actions">
        <button
          className={`btn btn--primary${remindSavePulse ? ' btn--pulse-reminder' : ''}`}
          onClick={onSaveSession}
          disabled={disabled}
        >
          Save Session
        </button>
        <p className="sidebar__hint">Ctrl+S</p>
        <button className="btn" onClick={onOpenSession}>
          Open Session
        </button>
        <p className="sidebar__hint">Ctrl+O</p>
        <button
          className="btn"
          onClick={onExport}
          disabled={disabled}
        >
          Save Image
        </button>
        <button
          className="btn"
          onClick={onClearAll}
          disabled={disabled}
        >
          Clear All
        </button>
      </section>
    </aside>
  );
}
