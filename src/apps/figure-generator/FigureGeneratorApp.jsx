import { useRef, useState } from 'react';
import { useFigureData } from './hooks/useFigureData';
import DataPreview from './components/DataPreview';
import FigureConfig from './components/FigureConfig';
import FigurePreview from './components/FigurePreview';
import { exportPNG, exportSVG, exportPDF } from './utils/exportFigure';
import { useToolSnapshot } from '../../shared/persistence/useToolSnapshot';
import ToolHeader from '../../shared/ui/ToolHeader';
import ToolActionBar from '../../shared/ui/ToolActionBar';
import './figure-generator.css';

export default function FigureGeneratorApp({ instanceId, initialState = null }) {
  const fig = useFigureData(initialState);
  const chartRef = useRef(null);
  const [exportError, setExportError] = useState('');

  useToolSnapshot(instanceId, 'figure-generator', fig.getSnapshot);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file) fig.loadFile(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) fig.loadFile(file);
  };

  const baseName = fig.fileName.replace(/\.[^.]+$/, '') || 'figure';

  const doExport = async (format) => {
    if (!chartRef.current) return;
    setExportError('');
    try {
      if (format === 'png') await exportPNG(chartRef.current, baseName, 3);
      else if (format === 'svg') exportSVG(chartRef.current, baseName);
      else if (format === 'pdf') await exportPDF(chartRef.current, baseName, fig.config.width, fig.config.height + 40);
    } catch (e) {
      setExportError(e.message || 'Export failed');
    }
  };

  return (
    <div className="figure-generator app">
      <ToolHeader
        title="Figure Generator"
        subtitle="Publication-quality charts from CSV or Excel"
      />

      {fig.hasData && (
        <ToolActionBar hint={fig.fileName} data-tour="fg-export">
          <button type="button" className="lt-btn" onClick={() => doExport('png')}>PNG</button>
          <button type="button" className="lt-btn" onClick={() => doExport('svg')}>SVG</button>
          <button type="button" className="lt-btn lt-btn--primary" onClick={() => doExport('pdf')}>PDF</button>
        </ToolActionBar>
      )}

      {!fig.hasData ? (
        <div
          className="fg-upload"
          data-tour="fg-upload"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFile}
            className="fg-upload__input"
            id="fg-file-input"
          />
          <label htmlFor="fg-file-input" className="fg-upload__label">
            <span className="fg-upload__icon">📊</span>
            <strong>Upload dataset</strong>
            <span>CSV, XLSX, or XLS</span>
            {fig.loading && <span className="fg-upload__loading">Parsing…</span>}
            {fig.parseError && <span className="fg-upload__error">{fig.parseError}</span>}
          </label>
        </div>
      ) : (
        <div className="fg-workspace">
          <aside className="fg-sidebar" data-tour="fg-config">
            <FigureConfig
              headers={fig.headers}
              config={fig.config}
              onChange={fig.updateConfig}
            />
            <button
              type="button"
              className="lt-btn fg-reload"
              onClick={() => document.getElementById('fg-file-input')?.click()}
            >
              Load different file
            </button>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFile}
              className="fg-upload__input"
              id="fg-file-input"
            />
          </aside>

          <main className="fg-main">
            <section className="fg-chart-section" data-tour="fg-preview">
              <div ref={chartRef} className="fg-chart-export-target">
                <FigurePreview rows={fig.rows} config={fig.config} />
              </div>
              {exportError && <p className="fg-export-error">{exportError}</p>}
            </section>

            <DataPreview
              headers={fig.headers}
              rows={fig.previewRows}
              totalRows={fig.rows.length}
            />
          </main>
        </div>
      )}
    </div>
  );
}
