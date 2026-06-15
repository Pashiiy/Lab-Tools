export default function ChartOptionsDrawer({ open, options, chartView, onChange }) {
  if (!open) return null;

  const update = (patch) => onChange({ ...options, [chartView]: { ...options[chartView], ...patch } });
  const viewOpts = options[chartView];

  const RadioGroup = ({ label, name, value, onValueChange, choices }) => (
    <div className="qi-tc-options__row">
      <span className="qi-tc-options__label">{label}</span>
      <div className="qi-tc-options__radios" role="radiogroup" aria-label={label}>
        {choices.map(({ id, label: choiceLabel }) => (
          <label key={id} className="qi-tc-options__radio">
            <input
              type="radio"
              name={`${chartView}-${name}`}
              checked={value === id}
              onChange={() => onValueChange(id)}
            />
            {choiceLabel}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <section className="qi-card qi-tc-options">
      <h3 className="qi-tc-options__title">Chart Options</h3>

      {(chartView === 'percent' || chartView === 'fold' || chartView === 'ratio') && (
        <RadioGroup
          label="Y-axis scale"
          name="yAxisScale"
          value={viewOpts.yAxisScale}
          onValueChange={(v) => update({ yAxisScale: v })}
          choices={[
            { id: 'linear', label: 'Linear' },
            { id: 'log2', label: 'Log2' },
          ]}
        />
      )}

      {chartView !== 'ratio' && (
        <RadioGroup
          label="Error bars"
          name="showErrorBands"
          value={viewOpts.showErrorBands ? 'show' : 'hide'}
          onValueChange={(v) => update({ showErrorBands: v === 'show' })}
          choices={[
            { id: 'show', label: 'Show' },
            { id: 'hide', label: 'Hide' },
          ]}
        />
      )}

      <RadioGroup
        label="Line style"
        name="lineStyle"
        value={viewOpts.lineStyle}
        onValueChange={(v) => update({ lineStyle: v })}
        choices={[
          { id: 'smooth', label: 'Smooth' },
          { id: 'straight', label: 'Straight' },
        ]}
      />

      <RadioGroup
        label="Show data points"
        name="showDataPoints"
        value={viewOpts.showDataPoints}
        onValueChange={(v) => update({ showDataPoints: v })}
        choices={[
          { id: 'always', label: 'Always' },
          { id: 'hover', label: 'On hover' },
          { id: 'never', label: 'Never' },
        ]}
      />

      {chartView !== 'ratio' && (
        <label className="qi-tc-options__checkbox">
          <input
            type="checkbox"
            checked={viewOpts.combineDilutions}
            onChange={(e) => update({ combineDilutions: e.target.checked })}
          />
          <span>
            Combine dilutions — average all selected dilutions into one line per target (mean ± SD
            band)
          </span>
        </label>
      )}

      {chartView !== 'ratio' && (
        <label className="qi-tc-options__checkbox">
          <input
            type="checkbox"
            checked={viewOpts.dilutionLabels}
            onChange={(e) => update({ dilutionLabels: e.target.checked })}
          />
          <span>Show dilution labels (1:10, 1:100, etc.) in the legend</span>
        </label>
      )}
    </section>
  );
}
