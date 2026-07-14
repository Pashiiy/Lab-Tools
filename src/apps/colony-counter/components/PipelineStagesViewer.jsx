import { useEffect, useMemo, useState } from 'react';

/**
 * Debug-only pipeline stage scrubber — slider + prev/next, no pan/zoom.
 */
export default function PipelineStagesViewer({ stages, onClose }) {
  const [idx, setIdx] = useState(0);
  const list = Array.isArray(stages) ? stages : [];
  const stage = list[idx] || null;

  const src = useMemo(() => {
    if (!stage?.imageBase64) return null;
    const mime = stage.mimeType || 'image/jpeg';
    return `data:${mime};base64,${stage.imageBase64}`;
  }, [stage]);

  useEffect(() => {
    setIdx(0);
  }, [stages]);

  if (!list.length) return null;

  return (
    <div className="cc-stages-modal" role="dialog" aria-label="Processing stages">
      <div className="cc-stages-modal__panel">
        <header className="cc-stages-modal__header">
          <div>
            <strong>Processing stages</strong>
            <span className="cc-stages-modal__sub">
              {stage?.label || stage?.name || '—'} ({idx + 1}/{list.length})
            </span>
          </div>
          <button type="button" className="lt-btn lt-btn--small" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="cc-stages-modal__viewport">
          {src && (
            <img
              src={src}
              alt={stage?.label || 'stage'}
              className="cc-stages-modal__img"
              draggable={false}
            />
          )}
        </div>

        <div className="cc-stages-modal__controls">
          <button
            type="button"
            className="lt-btn lt-btn--small"
            disabled={idx <= 0}
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
          >
            Prev
          </button>
          <input
            type="range"
            min={0}
            max={list.length - 1}
            value={idx}
            onChange={(e) => setIdx(Number(e.target.value))}
            className="cc-stages-modal__slider"
            aria-label="Stage"
          />
          <button
            type="button"
            className="lt-btn lt-btn--small"
            disabled={idx >= list.length - 1}
            onClick={() => setIdx((i) => Math.min(list.length - 1, i + 1))}
          >
            Next
          </button>
        </div>
        <p className="cc-stages-modal__hint">Scrub the slider to step through stages from this count run</p>
      </div>
    </div>
  );
}
