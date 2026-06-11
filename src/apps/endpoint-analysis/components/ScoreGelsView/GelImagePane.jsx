import { useRef, useCallback, useEffect } from 'react';
import ImageControlsToolbar from './ImageControlsToolbar';
import { getImageStyle, handleWheelZoom } from '../GelPanel/gelUtils';
import { IMAGE_FILE_ACCEPT } from '../../../../shared/image/constants';

export default function GelImagePane({
  label,
  gel,
  onUpload,
  onUpdate,
  onReset,
}) {
  const inputRef = useRef(null);
  const viewportRef = useRef(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const hasImage = Boolean(gel.src);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) onUpload(file);
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
    <div className="gel-image-pane">
      <div className="gel-image-pane__viewport-wrap">
        {hasImage ? (
          <div
            ref={viewportRef}
            className={`gel-image-pane__viewport${canPan ? ' gel-image-pane__viewport--pannable' : ''}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img
              src={gel.src}
              alt={label}
              className="gel-image-pane__image"
              style={getImageStyle(gel)}
              draggable={false}
            />
          </div>
        ) : (
          <button
            type="button"
            className="gel-image-pane__upload"
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <span className="gel-image-pane__upload-label">{label}</span>
            <svg
              className="gel-image-pane__upload-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M12 16V8M8 12l4-4 4 4" />
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
            <span className="gel-image-pane__upload-text">
              Click to upload or drag image here
            </span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_FILE_ACCEPT}
          className="gel-image-pane__input"
          onChange={handleFile}
        />
      </div>
      <ImageControlsToolbar gel={gel} onUpdate={onUpdate} onReset={onReset} />
    </div>
  );
}
