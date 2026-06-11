import { useEffect, useRef, useCallback } from 'react';
import GelControls from './GelControls';
import { getImageStyle, handleWheelZoom } from './gelUtils';

export default function GelModal({ gel, label, onClose, onUpdate, onReset }) {
  const viewportRef = useRef(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleWheel = useCallback(
    (e) => {
      if (!viewportRef.current) return;
      handleWheelZoom(e, gel, viewportRef.current, onUpdate);
    },
    [gel, onUpdate]
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleMouseDown = (e) => {
    if (e.button !== 0 || gel.zoom <= 100) return;
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
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

  const canPan = gel.zoom > 100;

  return (
    <div className="gel-modal" onClick={onClose} role="dialog" aria-modal="true">
      <div className="gel-modal__content" onClick={(e) => e.stopPropagation()}>
        <div
          ref={viewportRef}
          className={`gel-modal__viewport${canPan ? ' gel-modal__viewport--pannable' : ''}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            src={gel.src}
            alt={label}
            className="gel-modal__image"
            style={getImageStyle(gel)}
            draggable={false}
          />
        </div>
        <div className="gel-modal__toolbar">
          <GelControls gel={gel} onUpdate={onUpdate} onReset={onReset} compact />
        </div>
      </div>
    </div>
  );
}
