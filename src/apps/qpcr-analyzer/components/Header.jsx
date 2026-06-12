export default function Header({
  fileName,
  experimentName,
  stats,
  onUpload,
  onExport,
  hasData,
}) {
  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="app-title">qPCR Analysis</h1>
        {hasData && (
          <span className="file-badge" title={fileName}>
            {experimentName || fileName}
          </span>
        )}
      </div>
      {hasData && (
        <div className="header-center">
          <span className="stat-pill">{stats.wells} wells</span>
          <span className="stat-pill">{stats.samples} samples</span>
          <span className="stat-pill">{stats.targets} targets</span>
          {stats.ntc > 0 && (
            <span className="stat-pill stat-pill--warning">{stats.ntc} NTC</span>
          )}
          {stats.undetermined > 0 && (
            <span className="stat-pill stat-pill--error">
              {stats.undetermined} undetermined
            </span>
          )}
        </div>
      )}
      {hasData && (
        <div className="header-actions" data-tour="qpcr-export">
          <button type="button" className="btn-primary" onClick={onExport}>
            Export Excel
          </button>
          <label className="btn-secondary upload-header-btn">
            Open File
            <input
              type="file"
              accept=".eds,.xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) onUpload(file);
                e.target.value = '';
              }}
              hidden
            />
          </label>
        </div>
      )}
    </header>
  );
}
