const PLOT_TYPES = [
  { id: 'bar', label: 'Bar' },
  { id: 'line', label: 'Line' },
  { id: 'scatter', label: 'Scatter' },
  { id: 'area', label: 'Area' },
  { id: 'box', label: 'Box' },
  { id: 'heatmap', label: 'Heatmap' },
  { id: 'histogram', label: 'Histogram' },
];

export default function MappingPanel({ dataset, plot, onChange }) {
  const cols = dataset?.columns || [];
  const opt = (id, label) => (
    <label key={id} className="fs-map__field">
      <span>{label}</span>
      <select
        className="lt-input"
        value={plot[id] || ''}
        onChange={(e) => onChange({ [id]: e.target.value || null })}
      >
        <option value="">—</option>
        {cols.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <aside className="fs-map" aria-label="Plot mapping">
      <h3 className="fs-map__title">Plot mapping</h3>
      <label className="fs-map__field">
        <span>Plot type</span>
        <select
          className="lt-input"
          value={plot.type}
          onChange={(e) => onChange({ type: e.target.value })}
        >
          {PLOT_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      {opt('xColumnId', 'X axis')}
      {opt('yColumnId', 'Y axis')}
      {opt('groupColumnId', 'Group')}
      {opt('errorColumnId', 'Error (custom)')}
      <label className="fs-map__field">
        <span>Error bars</span>
        <select
          className="lt-input"
          value={plot.errorMode}
          onChange={(e) => onChange({ errorMode: e.target.value })}
        >
          <option value="sem">SEM</option>
          <option value="sd">SD</option>
          <option value="ci">95% CI</option>
          <option value="custom">Custom column</option>
        </select>
      </label>
      {plot.type === 'bar' && (
        <div className="fs-map__checks">
          <label>
            <input
              type="checkbox"
              checked={!!plot.stacked}
              onChange={(e) => onChange({ stacked: e.target.checked })}
            />
            Stacked
          </label>
          <label>
            <input
              type="checkbox"
              checked={!!plot.horizontal}
              onChange={(e) => onChange({ horizontal: e.target.checked })}
            />
            Horizontal
          </label>
        </div>
      )}
    </aside>
  );
}
