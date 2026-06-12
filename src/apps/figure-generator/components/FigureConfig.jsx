import {
  CHART_TYPES,
  ERROR_MODES,
  LEGEND_POSITIONS,
} from '../utils/chartTypes';

export default function FigureConfig({ headers, config, onChange }) {
  const numericHeaders = headers.filter((h) => h !== config.xColumn);

  return (
    <section className="fg-config">
      <h3 className="fg-section-title">Figure Settings</h3>

      <label className="fg-field">
        <span>Chart type</span>
        <select
          className="lt-input"
          value={config.chartType}
          onChange={(e) => onChange({ chartType: e.target.value })}
        >
          {CHART_TYPES.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </label>

      <label className="fg-field">
        <span>X column</span>
        <select
          className="lt-input"
          value={config.xColumn}
          onChange={(e) => onChange({ xColumn: e.target.value, xLabel: e.target.value })}
        >
          {headers.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
      </label>

      <label className="fg-field">
        <span>Y column</span>
        <select
          className="lt-input"
          value={config.yColumn}
          onChange={(e) => onChange({ yColumn: e.target.value, yLabel: e.target.value })}
        >
          {numericHeaders.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
      </label>

      {['groupedBar', 'bar', 'scatter', 'line', 'box', 'violin'].includes(config.chartType) && (
        <label className="fg-field">
          <span>Grouping column (optional)</span>
          <select
            className="lt-input"
            value={config.groupColumn}
            onChange={(e) => onChange({ groupColumn: e.target.value })}
          >
            <option value="">None</option>
            {headers.filter((h) => h !== config.yColumn).map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </label>
      )}

      {['bar', 'groupedBar', 'line'].includes(config.chartType) && (
        <label className="fg-field">
          <span>Error bars</span>
          <select
            className="lt-input"
            value={config.errorMode}
            onChange={(e) => onChange({ errorMode: e.target.value })}
          >
            {ERROR_MODES.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </label>
      )}

      {config.chartType === 'histogram' && (
        <label className="fg-field">
          <span>Bins</span>
          <input
            type="number"
            className="lt-input"
            min="4"
            max="50"
            value={config.histogramBins}
            onChange={(e) => onChange({ histogramBins: Number(e.target.value) || 12 })}
          />
        </label>
      )}

      <label className="fg-field">
        <span>Title</span>
        <input
          className="lt-input"
          value={config.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </label>

      <div className="fg-field-row">
        <label className="fg-field">
          <span>X-axis label</span>
          <input
            className="lt-input"
            value={config.xLabel}
            onChange={(e) => onChange({ xLabel: e.target.value })}
          />
        </label>
        <label className="fg-field">
          <span>Y-axis label</span>
          <input
            className="lt-input"
            value={config.yLabel}
            onChange={(e) => onChange({ yLabel: e.target.value })}
          />
        </label>
      </div>

      <div className="fg-field-row">
        <label className="fg-field">
          <span>Font size</span>
          <input
            type="number"
            className="lt-input"
            min="8"
            max="24"
            value={config.fontSize}
            onChange={(e) => onChange({ fontSize: Number(e.target.value) || 12 })}
          />
        </label>
        <label className="fg-field">
          <span>Title size</span>
          <input
            type="number"
            className="lt-input"
            min="10"
            max="32"
            value={config.titleSize}
            onChange={(e) => onChange({ titleSize: Number(e.target.value) || 14 })}
          />
        </label>
      </div>

      <div className="fg-field-row">
        <label className="fg-field">
          <span>Width (px)</span>
          <input
            type="number"
            className="lt-input"
            min="320"
            max="1200"
            step="10"
            value={config.width}
            onChange={(e) => onChange({ width: Number(e.target.value) || 640 })}
          />
        </label>
        <label className="fg-field">
          <span>Height (px)</span>
          <input
            type="number"
            className="lt-input"
            min="240"
            max="900"
            step="10"
            value={config.height}
            onChange={(e) => onChange({ height: Number(e.target.value) || 420 })}
          />
        </label>
      </div>

      <label className="fg-field fg-field--check">
        <input
          type="checkbox"
          checked={config.showLegend}
          onChange={(e) => onChange({ showLegend: e.target.checked })}
        />
        <span>Show legend</span>
      </label>

      {config.showLegend && (
        <label className="fg-field">
          <span>Legend position</span>
          <select
            className="lt-input"
            value={config.legendPosition}
            onChange={(e) => onChange({ legendPosition: e.target.value })}
          >
            {LEGEND_POSITIONS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </label>
      )}
    </section>
  );
}
