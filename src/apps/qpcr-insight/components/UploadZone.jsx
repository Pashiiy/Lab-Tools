import { useRef, useState } from 'react';
import { ImageImportSpinner } from '../../../shared/image/ImageImportStates';
import '../../../shared/image/image-import.css';

export default function UploadZone({ loading, error, onFileSelect, onDismissError }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith('.eds') && !/\.xlsx?$/.test(name)) return;
    onFileSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="qi-upload-container">
      {error && (
        <div className="image-upload-error-banner qi-upload-error-banner">
          <p className="image-upload-error-banner__message">{error}</p>
          <button
            type="button"
            className="image-upload-error-banner__dismiss"
            onClick={onDismissError}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="qi-upload-container__loading">
          <ImageImportSpinner label="Reading experiment file..." />
        </div>
      ) : (
        <div
          className={`upload-zone${dragOver ? ' upload-zone--active' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
        >
          <div className="upload-zone__icon">+</div>
          <p className="upload-zone__title">Drop your QuantStudio file here</p>
          <p className="upload-zone__subtitle">or click to browse</p>
          <p className="upload-zone__formats">EDS, XLSX</p>
          <input
            ref={inputRef}
            type="file"
            accept=".eds,.xlsx,.xls"
            className="upload-zone__input"
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
      )}
    </div>
  );
}
