export function ImageImportSpinner({ label = 'Loading image...', detail = null }) {
  return (
    <div className="image-import-state image-import-state--loading">
      <div className="image-import-spinner" aria-hidden />
      <span className="image-import-state__label">{label}</span>
      {detail && <span className="image-import-state__detail">{detail}</span>}
    </div>
  );
}

export function ImageImportError({ message, onRetry }) {
  return (
    <div className="image-import-state image-import-state--error">
      <p className="image-import-state__error">{message}</p>
      <button type="button" className="image-import-state__retry" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
