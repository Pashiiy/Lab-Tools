export default function ZoomControls({ scale, onZoomIn, onZoomOut, onFit }) {
  const percent = Math.round(scale * 100);

  return (
    <div className="zoom-controls">
      <button type="button" className="zoom-controls__btn" onClick={onZoomOut} title="Zoom out">
        −
      </button>
      <button type="button" className="zoom-controls__btn zoom-controls__btn--fit" onClick={onFit} title="Fit to window">
        fit
      </button>
      <span className="zoom-controls__level">{percent}%</span>
      <button type="button" className="zoom-controls__btn" onClick={onZoomIn} title="Zoom in">
        +
      </button>
    </div>
  );
}
