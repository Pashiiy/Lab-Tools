export default function CategoryPanel({
  categories,
  activeCategory,
  categoryCounts,
  onSelectCategory,
  onUpdateLabel,
  onUpdateColor,
  onAddCategory,
  onDeleteCategory,
  dots,
}) {
  return (
    <section className="sidebar__section category-panel">
      <h3 className="sidebar__heading">Categories</h3>
      <ul className="category-list">
        {categories.map((cat) => {
          const isActive = cat.id === activeCategory;
          const hasDots = dots.some((d) => d.categoryId === cat.id);
          const canDelete = categories.length > 1 && !hasDots;

          return (
            <li
              key={cat.id}
              className={`category-row${isActive ? ' category-row--active' : ''}`}
              style={{ '--cat-color': cat.color }}
              onClick={() => onSelectCategory(cat.id)}
            >
              <label
                className="category-row__swatch"
                onClick={(e) => e.stopPropagation()}
              >
                <span style={{ backgroundColor: cat.color }} />
                <input
                  type="color"
                  value={cat.color}
                  onChange={(e) => onUpdateColor(cat.id, e.target.value)}
                />
              </label>
              <input
                type="text"
                className="category-row__label"
                value={cat.label}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onUpdateLabel(cat.id, e.target.value)}
              />
              <span className="category-row__count">{categoryCounts[cat.id] ?? 0}</span>
              <button
                type="button"
                className="category-row__delete"
                disabled={!canDelete}
                title={!canDelete ? 'Remove dots first' : 'Delete category'}
                onClick={(e) => {
                  e.stopPropagation();
                  if (canDelete) onDeleteCategory(cat.id);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            </li>
          );
        })}
      </ul>
      {categories.length < 8 && (
        <button type="button" className="btn btn--small" onClick={onAddCategory}>
          + Add Category
        </button>
      )}
    </section>
  );
}
