import { ImageImportSpinner } from '../../../shared/image/ImageImportStates';
import FileDropZone from '../../../shared/ui/FileDropZone';
import '../../../shared/image/image-import.css';

export default function UploadZone({ loading, error, onFileSelect, onDismissError }) {
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
        <FileDropZone
          accept=".eds,.xlsx,.xls"
          title="Drop your QuantStudio file here"
          formats="EDS, XLSX"
          onFiles={(files) => {
            const file = files[0];
            if (!file) return;
            const name = file.name.toLowerCase();
            if (!name.endsWith('.eds') && !/\.xlsx?$/.test(name)) return;
            onFileSelect(file);
          }}
        />
      )}
    </div>
  );
}
