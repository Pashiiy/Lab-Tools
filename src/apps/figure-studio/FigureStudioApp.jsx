import { useCallback, useRef, useState } from 'react';
import { useFigureStudio } from './state/useFigureStudio';
import { useToolSnapshot } from '../../shared/persistence/useToolSnapshot';
import ToolHeader from '../../shared/ui/ToolHeader';
import ToolActionBar from '../../shared/ui/ToolActionBar';
import DataTable from './components/DataTable';
import MappingPanel from './components/MappingPanel';
import PlotCanvas from './components/PlotCanvas';
import FigureComposer from './components/FigureComposer';
import { FIGURE_PRESETS, getPreset } from './templates/presets';
import { applyTemplate, listBiologyTemplates } from './templates/biologyTemplates';
import { exportPlotPdf, exportPlotPng, exportPlotSvg } from './export/exportFigure';
import { listThemes, saveTheme } from './state/themesStore';
import './figure-studio.css';

export default function FigureStudioApp({ instanceId, isActive = true, initialState = null }) {
  const fs = useFigureStudio(initialState);
  const plotRef = useRef(null);
  const fileCsvRef = useRef(null);
  const fileXlsRef = useRef(null);
  const [themes, setThemes] = useState(() => listThemes());
  const [error, setError] = useState(null);
  const [view, setView] = useState('plot'); // plot | compose

  useToolSnapshot(instanceId, 'figure-studio', fs.getSnapshot);

  const preset = getPreset(fs.state.presetId);

  const onImportFile = async (e, kind) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      if (kind === 'csv') {
        const text = await file.text();
        fs.importCsvText(text, file.name);
      } else {
        await fs.importExcel(file);
      }
    } catch (err) {
      setError(err.message || 'Import failed');
    }
  };

  const handleExport = async (fmt) => {
    try {
      setError(null);
      const el = plotRef.current;
      const dpi = preset.exportDpi || 300;
      if (fmt === 'svg') exportPlotSvg(el, 'figure-studio.svg');
      else if (fmt === 'png300') await exportPlotPng(el, { filename: 'figure-studio-300.png', scale: 3 });
      else if (fmt === 'png600') await exportPlotPng(el, { filename: 'figure-studio-600.png', scale: 6 });
      else if (fmt === 'pdf') await exportPlotPdf(el, 'figure-studio.pdf');
      else if (fmt === 'tiff') {
        // TIFF via PNG fallback note — use PNG at high DPI for MVP
        await exportPlotPng(el, { filename: `figure-studio-${dpi}dpi.png`, scale: dpi / 96 });
      }
    } catch (err) {
      setError(err.message || 'Export failed');
    }
  };

  const applyTpl = useCallback(
    (id) => {
      const next = applyTemplate(fs.state, id);
      if (next) fs.applyFullState(next);
    },
    [fs]
  );

  return (
    <div className={`figure-studio app${isActive ? '' : ' figure-studio--inactive'}`}>
      <ToolHeader title="Figure Studio" subtitle="Publication figures from finalized data" />

      <ToolActionBar hint="Visualization only — does not recompute analysis results">
        <button type="button" className="lt-btn" onClick={() => fileCsvRef.current?.click()}>
          Import CSV
        </button>
        <button type="button" className="lt-btn" onClick={() => fileXlsRef.current?.click()}>
          Import Excel
        </button>
        <button type="button" className="lt-btn" onClick={fs.addDataset}>
          New Dataset
        </button>
        <button type="button" className="lt-btn" onClick={fs.undo} disabled={!fs.canUndo}>
          Undo
        </button>
        <button type="button" className="lt-btn" onClick={fs.redo} disabled={!fs.canRedo}>
          Redo
        </button>
        <button
          type="button"
          className={`lt-btn${view === 'plot' ? ' lt-btn--primary' : ''}`}
          onClick={() => setView('plot')}
        >
          Plot
        </button>
        <button
          type="button"
          className={`lt-btn${view === 'compose' ? ' lt-btn--primary' : ''}`}
          onClick={() => setView('compose')}
        >
          Compose
        </button>
        <button type="button" className="lt-btn" onClick={() => handleExport('svg')}>
          Export SVG
        </button>
        <button type="button" className="lt-btn" onClick={() => handleExport('png300')}>
          PNG 300
        </button>
        <button type="button" className="lt-btn" onClick={() => handleExport('png600')}>
          PNG 600
        </button>
        <button type="button" className="lt-btn" onClick={() => handleExport('pdf')}>
          PDF
        </button>
      </ToolActionBar>

      <input ref={fileCsvRef} type="file" accept=".csv,.tsv,.txt" hidden onChange={(e) => onImportFile(e, 'csv')} />
      <input ref={fileXlsRef} type="file" accept=".xlsx,.xls" hidden onChange={(e) => onImportFile(e, 'xlsx')} />

      {error && (
        <div className="fs-error" role="alert">
          {error}
          <button type="button" className="lt-btn lt-btn--small" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="fs-layout">
        <aside className="fs-sidebar">
          <h3>Datasets</h3>
          <ul className="fs-dataset-list">
            {fs.state.datasets.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  className={`fs-dataset-item${d.id === fs.state.activeDatasetId ? ' fs-dataset-item--active' : ''}`}
                  onClick={() => fs.selectDataset(d.id)}
                >
                  <span className="fs-dataset-item__name">{d.name}</span>
                  {d.readOnly && <span className="fs-dataset-item__badge">RO</span>}
                </button>
                <div className="fs-dataset-item__actions">
                  <button
                    type="button"
                    title="Rename"
                    onClick={() => {
                      const name = window.prompt('Dataset name', d.name);
                      if (name?.trim()) fs.renameDataset(d.id, name.trim());
                    }}
                  >
                    ✎
                  </button>
                  <button type="button" title="Duplicate" onClick={() => fs.dupDataset(d.id)}>
                    ⧉
                  </button>
                  <button type="button" title="Delete" onClick={() => fs.deleteDataset(d.id)}>
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <h3>Import from tools</h3>
          <div className="fs-tool-imports">
            <button type="button" className="lt-btn lt-btn--small" onClick={() => fs.importDemoTool('qpcr')}>
              qPCR sample
            </button>
            <button type="button" className="lt-btn lt-btn--small" onClick={() => fs.importDemoTool('endpoint')}>
              Endpoint sample
            </button>
            <button type="button" className="lt-btn lt-btn--small" onClick={() => fs.importDemoTool('colony')}>
              Colony sample
            </button>
          </div>

          <h3>Templates</h3>
          <div className="fs-tool-imports">
            {listBiologyTemplates().map((t) => (
              <button
                key={t.id}
                type="button"
                className="lt-btn lt-btn--small"
                onClick={() => applyTpl(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <h3>Preset</h3>
          <select
            className="lt-input"
            value={fs.state.presetId}
            onChange={(e) => fs.setPresetId(e.target.value)}
          >
            {Object.values(FIGURE_PRESETS).map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
            {themes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} (saved)
              </option>
            ))}
          </select>
          <button
            type="button"
            className="lt-btn lt-btn--small"
            style={{ marginTop: 8 }}
            onClick={() => {
              const label = window.prompt('Theme name', 'Bloom Lab Standard');
              if (!label?.trim()) return;
              const base = getPreset(fs.state.presetId);
              const saved = saveTheme({ ...base, label: label.trim() });
              setThemes(listThemes());
              fs.setPresetId(saved.id);
            }}
          >
            Save theme
          </button>
        </aside>

        <div className="fs-main">
          {view === 'compose' ? (
            <FigureComposer
              figure={fs.state.figure}
              dataset={fs.activeDataset}
              plot={fs.state.plot}
              presetId={fs.state.presetId}
              onChangeFigure={(figure) => fs.applyFullState({ ...fs.state, figure })}
            />
          ) : (
            <>
              <DataTable
                dataset={fs.activeDataset}
                onSetCell={fs.setCell}
                onInsertRow={fs.insertRow}
                onDeleteRow={fs.deleteRow}
                onInsertColumn={fs.insertColumn}
                onDeleteColumn={fs.deleteColumn}
                onRenameColumn={fs.renameColumn}
                onPasteTable={fs.pasteClipboard}
              />
              <div className="fs-plot-row">
                <MappingPanel
                  dataset={fs.activeDataset}
                  plot={fs.state.plot}
                  onChange={fs.setPlot}
                />
                <div className="fs-plot-host" ref={plotRef}>
                  <PlotCanvas
                    dataset={fs.activeDataset}
                    plot={fs.state.plot}
                    presetId={fs.state.presetId}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
