import { useRef, useState } from 'react';
import './file-drop-zone.css';

/**
 * Shared drag-and-drop / click-to-browse file picker.
 * Tools keep accept filters and validation; this only handles the chrome.
 */
export default function FileDropZone({
  accept,
  multiple = false,
  onFiles,
  title,
  subtitle = 'or click to browse',
  formats,
  disabled = false,
  className = '',
  'data-tour': dataTour,
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const emitFiles = (fileList) => {
    if (disabled || !onFiles) return;
    const files = [...(fileList ?? [])];
    if (files.length === 0) return;
    onFiles(multiple ? files : files.slice(0, 1));
  };

  const openPicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  return (
    <div
      className={`lt-file-drop${dragOver ? ' lt-file-drop--active' : ''}${disabled ? ' lt-file-drop--disabled' : ''}${className ? ` ${className}` : ''}`}
      data-tour={dataTour}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        emitFiles(e.dataTransfer.files);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPicker();
        }
      }}
    >
      <div className="lt-file-drop__icon" aria-hidden>
        +
      </div>
      {title && <p className="lt-file-drop__title">{title}</p>}
      {subtitle && <p className="lt-file-drop__subtitle">{subtitle}</p>}
      {formats && <p className="lt-file-drop__formats">{formats}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="lt-file-drop__input"
        disabled={disabled}
        onChange={(e) => {
          emitFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
