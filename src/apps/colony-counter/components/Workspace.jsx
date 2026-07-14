import UploadZone from './UploadZone';
import CanvasView from './CanvasView';
import PlateSelector from './PlateSelector';
import { ImageImportSpinner } from '../../../shared/image/ImageImportStates';

export default function Workspace({
  image,
  loadingImage,
  loadingLabel = 'Loading image…',
  uploadError,
  onDismissUploadError,
  dots,
  opacity,
  onUpload,
  onAddDot,
  onRemoveDot,
  onMoveDot,
  findDotAt,
  activePlateId,
  plates,
  onSelectPlate,
  onRenamePlate,
  onRemovePlate,
  onPrevPlate,
  onNextPlate,
  onAddPlates,
  canPrevPlate,
  canNextPlate,
  isActive = true,
  interactionMode = 'mark',
  mask = null,
  draftPolygon = null,
  onMaskChange,
  onDraftPolygonChange,
  clusters = null,
  onEditClusterCount,
}) {
  const handleUpload = (filesOrFile) => {
    if (Array.isArray(filesOrFile)) onUpload(filesOrFile);
    else onUpload([filesOrFile]);
  };

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

      {plates?.length > 0 && (
        <PlateSelector
          plates={plates}
          activePlateId={activePlateId}
          onSelect={onSelectPlate}
          onRename={onRenamePlate}
          onRemove={onRemovePlate}
          onPrev={onPrevPlate}
          onNext={onNextPlate}
          onAdd={onAddPlates}
          canPrev={canPrevPlate}
          canNext={canNextPlate}
          canRemove={plates.length > 0}
        />
      )}

      {loadingImage ? (
        <div className="workspace__loading">
          <ImageImportSpinner label={loadingLabel} />
        </div>
      ) : !image ? (
        <UploadZone onUpload={handleUpload} multiple />
      ) : (
        <CanvasView
          key={activePlateId || 'plate'}
          image={image}
          dots={dots}
          opacity={opacity}
          onAddDot={onAddDot}
          onRemoveDot={onRemoveDot}
          onMoveDot={onMoveDot}
          findDotAt={findDotAt}
          isActive={isActive}
          interactionMode={interactionMode}
          mask={mask}
          draftPolygon={draftPolygon}
          onMaskChange={onMaskChange}
          onDraftPolygonChange={onDraftPolygonChange}
          clusters={clusters}
          onEditClusterCount={onEditClusterCount}
        />
      )}
    </main>
  );
}
