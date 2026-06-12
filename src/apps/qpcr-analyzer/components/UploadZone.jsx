import { useCallback, useState } from 'react';

export default function UploadZone({ onFile, parseError, loading }) {
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    (file) => {
      if (!file) return;
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['eds', 'xlsx', 'xls'].includes(ext)) return;
      onFile(file);
    },
    [onFile]
  );

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile]
  );

  const onInputChange = useCallback(
    (e) => {
      handleFile(e.target.files[0]);
      e.target.value = '';
    },
    [handleFile]
  );

  return (
    <div className="upload-container" data-tour="qpcr-upload">
      <div
        className={`upload-zone${dragOver ? ' upload-zone--active' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {loading ? (
          <div className="upload-spinner" aria-label="Loading" />
        ) : (
          <div className="upload-icon">📂</div>
        )}
        <h2>Drop your .eds or .xlsx file here</h2>
        <p className="upload-hint">or click to browse</p>
        <p className="upload-hint upload-hint--sub">
          .eds files are read directly from QuantStudio — no Excel export needed
        </p>
        <label className="btn-primary upload-btn">
          Choose file
          <input
            type="file"
            accept=".eds,.xlsx,.xls"
            onChange={onInputChange}
            hidden
            disabled={loading}
          />
        </label>
      </div>
      {parseError && <p className="parse-error">{parseError}</p>}
    </div>
  );
}
