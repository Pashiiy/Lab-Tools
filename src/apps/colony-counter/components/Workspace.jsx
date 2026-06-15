import UploadZone from './UploadZone';
import CanvasView from './CanvasView';
import { ImageImportSpinner } from '../../../shared/image/ImageImportStates';

export default function Workspace({
  image,
  loadingImage,
  uploadError,
  onDismissUploadError,
  dots,
  opacity,
  onUpload,
  onAddDot,
  onRemoveDot,
  findDotAt,
}) {
  return (
    <main className={`workspace${image ? ' workspace--canvas' : ''}`} data-tour="cc-workspace">
      {uploadError && (
        <div className="image-upload-error-banner">
          <p className="image-upload-error-banner__message">{uploadError}</p>
          <button
            type="button"
            className="image-upload-error-banner__dismiss"
            onClick={onDismissUploadError}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}
      {loadingImage ? (
        <div className="workspace__loading">
          <ImageImportSpinner label="Loading image..." />
        </div>
      ) : !image ? (
        <UploadZone onUpload={onUpload} />
      ) : (
        <CanvasView
          image={image}
          dots={dots}
          opacity={opacity}
          onAddDot={onAddDot}
          onRemoveDot={onRemoveDot}
          findDotAt={findDotAt}
        />
      )}
    </main>
  );
}
