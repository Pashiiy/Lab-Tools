import PlotCanvas from './PlotCanvas';

const LAYOUTS = {
  '1x1': { cols: 1, rows: 1 },
  '1x2': { cols: 2, rows: 1 },
  '2x2': { cols: 2, rows: 2 },
  '1x3': { cols: 3, rows: 1 },
  '3x2': { cols: 3, rows: 2 },
};

function ensurePanels(figure, count) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const panels = [...(figure.panels || [])];
  while (panels.length < count) {
    panels.push({
      id: `panel-${panels.length}-${Date.now()}`,
      letter: letters[panels.length] || String(panels.length + 1),
      plotType: 'bar',
    });
  }
  return panels.slice(0, count);
}

/**
 * Multi-panel figure composition (Phase 5).
 */
export default function FigureComposer({ figure, dataset, plot, presetId, onChangeFigure }) {
  const layoutId = figure?.layout || '1x1';
  const layout = LAYOUTS[layoutId] || LAYOUTS['1x1'];
  const count = layout.cols * layout.rows;
  const panels = ensurePanels(figure || {}, count);

  const setLayout = (id) => {
    const L = LAYOUTS[id];
    const n = L.cols * L.rows;
    onChangeFigure({
      ...figure,
      layout: id,
      panels: ensurePanels(figure, n),
    });
  };

  return (
    <div className="fs-composer">
      <div className="fs-composer__toolbar">
        <label>
          Layout
          <select
            className="lt-input"
            value={layoutId}
            onChange={(e) => setLayout(e.target.value)}
          >
            {Object.keys(LAYOUTS).map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        <span className="fs-composer__hint">Panels auto-lettered · shared dataset/plot mapping</span>
      </div>
      <div
        className="fs-composer__grid"
        style={{
          gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
          gridTemplateRows: `repeat(${layout.rows}, minmax(180px, 1fr))`,
        }}
      >
        {panels.map((p) => (
          <article key={p.id} className="fs-composer__panel">
            <header className="fs-composer__panel-label">
              <span>{p.letter}</span>
              <select
                className="lt-input fs-composer__plot-type"
                value={p.plotType || plot.type}
                onChange={(e) => {
                  onChangeFigure({
                    ...figure,
                    layout: layoutId,
                    panels: panels.map((panel) =>
                      panel.id === p.id ? { ...panel, plotType: e.target.value } : panel
                    ),
                  });
                }}
                aria-label={`Panel ${p.letter} plot type`}
              >
                {['bar', 'line', 'scatter', 'area', 'box', 'heatmap', 'histogram'].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </header>
            <div className="fs-composer__panel-plot">
              <PlotCanvas
                dataset={dataset}
                plot={{ ...plot, type: p.plotType || plot.type }}
                presetId={presetId}
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
