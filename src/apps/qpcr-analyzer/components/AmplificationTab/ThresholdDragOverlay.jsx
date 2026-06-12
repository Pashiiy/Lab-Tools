import { useCallback, useRef, useState } from 'react';

export default function ThresholdDragOverlay({
  yMin,
  yMax,
  threshold,
  onChange,
  height,
  marginTop = 20,
  marginBottom = 30,
}) {
  const dragging = useRef(false);
  const [hovering, setHovering] = useState(false);
  const plotHeight = height - marginTop - marginBottom;

  const valueToY = useCallback(
    (val) => {
      if (yMax === yMin) return marginTop + plotHeight / 2;
      return marginTop + ((yMax - val) / (yMax - yMin)) * plotHeight;
    },
    [yMin, yMax, marginTop, plotHeight]
  );

  const yToValue = useCallback(
    (pixelY) => {
      const rel = (pixelY - marginTop) / plotHeight;
      const clamped = Math.max(0, Math.min(1, rel));
      return yMax - clamped * (yMax - yMin);
    },
    [yMin, yMax, marginTop, plotHeight]
  );

  const lineY = valueToY(threshold);

  const onMouseDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    if (Math.abs(y - lineY) <= 8) {
      dragging.current = true;
      e.preventDefault();
    }
  };

  const onMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    if (dragging.current) {
      onChange(yToValue(y));
    } else {
      setHovering(Math.abs(y - lineY) <= 8);
    }
  };

  const onMouseUp = () => {
    dragging.current = false;
  };

  const onMouseLeave = () => {
    dragging.current = false;
    setHovering(false);
  };

  return (
    <div
      className="threshold-overlay"
      style={{ height }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      role="presentation"
    >
      <div
        className={`threshold-line${hovering || dragging.current ? ' threshold-line--active' : ''}`}
        style={{ top: lineY }}
      >
        <span className="threshold-handle">
          {threshold?.toFixed(3)}
        </span>
      </div>
    </div>
  );
}
