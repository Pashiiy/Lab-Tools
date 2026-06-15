import { useRef, useCallback, useEffect, useState } from 'react';
import GelModal from './GelModal';
import { getImageStyle, handleWheelZoom } from './gelUtils';
import { IMAGE_FILE_ACCEPT, isImageFile } from '../../../../shared/image/constants';
import { ImageImportSpinner, ImageImportError } from '../../../../shared/image/ImageImportStates';

export default function GelSlot({
  label,
  gel,
  onUpload,
  onRemove,
  onUpdate,
  onReset,
  onEdit,
  onClearError,
  isEditing,
}) {
  const inputRef = useRef(null);
  const viewportRef = useRef(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const hasImage = Boolean(gel.src) && !gel.loading;

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && isImageFile(file)) onUpload(file);
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleWheel = useCallback(
    (e) => {
      if (!hasImage || !viewportRef.current) return;
      handleWheelZoom(e, gel, viewportRef.current, onUpdate);
    },
    [gel, hasImage, onUpdate]
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || !hasImage) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel, hasImage]);

  const handleMouseDown = (e) => {
    if (!hasImage || gel.zoom <= 100 || e.button !== 0) return;
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    onUpdate('panX', gel.panX + dx);
    onUpdate('panY', gel.panY + dy);
  };

  const handleMouseUp = () => {
    dragging.current = false;
  };

  const canPan = hasImage && gel.zoom > 100;

  return (
    <>
      <div className="gel-slot">
        {gel.loading ? (
          <ImageImportSpinner label="Loading..." />
        ) : gel.error ? (
          <ImageImportError message={gel.error} onRetry={onClearError} />
        ) : hasImage ? (
          <>
            <div
              ref={viewportRef}
              className={`gel-slot__viewport${canPan ? ' gel-slot__viewport--pannable' : ''}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img
                src={gel.src}
                alt={label}
                className="gel-slot__image"
                style={getImageStyle(gel)}
                draggable={false}
              />
            </div>
            <span className="gel-slot__badge">{label}</span>
            <button
              type="button"
              className="gel-slot__expand"
              onClick={() => setModalOpen(true)}
              aria-label={`Expand ${label} gel`}
            >
              ⤢
            </button>
            <button
              type="button"
              className="gel-slot__remove"
              onClick={onRemove}
              aria-label={`Remove ${label} gel`}
            >
              ✕
            </button>
            <button
              type="button"
              className={`gel-slot__edit${isEditing ? ' gel-slot__edit--active' : ''}`}
              onClick={onEdit}
              aria-label={`Edit ${label} gel`}
            >
              ⚙
            </button>
          </>
        ) : (
          <button
            type="button"
            className="gel-slot__upload"
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <span className="gel-slot__upload-label">{label}</span>
            <svg
              className="gel-slot__icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M12 16V8M8 12l4-4 4 4" />
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
            <span className="gel-slot__upload-text">click or drag</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_FILE_ACCEPT}
          className="gel-slot__input"
          onChange={handleFile}
        />
      </div>

      {modalOpen && hasImage && (
        <GelModal
          gel={gel}
          label={label}
          onClose={() => setModalOpen(false)}
          onUpdate={onUpdate}
          onReset={onReset}
        />
      )}
    </>
  );
}
