import { useRef, useState, useCallback, useEffect } from 'react';
import { renderGelToCanvas } from '../utils/gelDisplayRenderer';
import {
  displayCacheKey,
  getCachedDisplay,
  setCachedDisplay,
} from '../utils/gelImageCache';
import RoiOverlay from './RoiOverlay';

const MIN_SCALE = 0.25;
const MAX_SCALE = 16;
const CLICK_THRESHOLD_PX = 5;

export default function ImageViewer({
  gelId,
  raw,
  imageWidth,
  imageHeight,
  displayAdjustments,
  inverted,
  rois,
  activeRoiId,
  onRoiClick,
  onSelectRoi,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [transform, setTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const pointerDownRef = useRef(null);

  const fitToWindow = useCallback(() => {
    const container = containerRef.current;
    if (!container || !raw) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const scale = Math.min(cw / imageWidth, ch / imageHeight, 1);
    const offsetX = (cw - imageWidth * scale) / 2;
    const offsetY = (ch - imageHeight * scale) / 2;
    setTransform({ scale, offsetX, offsetY });
  }, [raw, imageWidth, imageHeight]);

  useEffect(() => {
    fitToWindow();
    window.addEventListener('resize', fitToWindow);
    return () => window.removeEventListener('resize', fitToWindow);
  }, [fitToWindow]);

  useEffect(() => {
    if (!canvasRef.current || !raw) return undefined;

    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const cacheKey = gelId ? displayCacheKey(gelId, displayAdjustments) : null;
      const cached = cacheKey ? getCachedDisplay(cacheKey) : null;

      if (cached) {
        if (canvas.width !== cached.width) canvas.width = cached.width;
        if (canvas.height !== cached.height) canvas.height = cached.height;
        const ctx = canvas.getContext('2d', { alpha: false });
        ctx?.putImageData(cached.imageData, 0, 0);
        return;
      }

      renderGelToCanvas(raw, canvas, displayAdjustments);

      if (cacheKey) {
        const ctx = canvas.getContext('2d', { alpha: false });
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          setCachedDisplay(cacheKey, canvas.width, canvas.height, imageData);
        }
      }
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [gelId, raw, displayAdjustments]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setSpaceDown(true);
      }
    };
    const onKeyUp = (e) => {
      if (e.code === 'Space') setSpaceDown(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const screenToImage = useCallback(
    (clientX, clientY) => {
      const container = containerRef.current;
      if (!container) return null;
      const rect = container.getBoundingClientRect();
      return {
        x: (clientX - rect.left - transform.offsetX) / transform.scale,
        y: (clientY - rect.top - transform.offsetY) / transform.scale,
      };
    },
    [transform]
  );

  const zoomAt = useCallback((factor, anchorX, anchorY) => {
    setTransform((prev) => {
      const newScale = Math.min(Math.max(prev.scale * factor, MIN_SCALE), MAX_SCALE);
      return {
        scale: newScale,
        offsetX: anchorX - (anchorX - prev.offsetX) * (newScale / prev.scale),
        offsetY: anchorY - (anchorY - prev.offsetY) * (newScale / prev.scale),
      };
    });
  }, []);

  const handleWheel = useCallback(
    (e) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.12 : 0.89, e.clientX - rect.left, e.clientY - rect.top);
    },
    [zoomAt]
  );

  const handlePointerDown = (e) => {
    if (!raw) return;
    pointerDownRef.current = { x: e.clientX, y: e.clientY, imagePt: screenToImage(e.clientX, e.clientY) };

    if (spaceDown || e.button === 1) {
      setIsPanning(true);
      setPanStart({
        x: e.clientX,
        y: e.clientY,
        offsetX: transform.offsetX,
        offsetY: transform.offsetY,
      });
    }
  };

  const handlePointerMove = (e) => {
    if (isPanning && panStart) {
      setTransform((prev) => ({
        ...prev,
        offsetX: panStart.offsetX + (e.clientX - panStart.x),
        offsetY: panStart.offsetY + (e.clientY - panStart.y),
      }));
    }
  };

  const handlePointerUp = (e) => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      pointerDownRef.current = null;
      return;
    }

    const down = pointerDownRef.current;
    pointerDownRef.current = null;
    if (!down?.imagePt) return;

    const dist = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    if (dist > CLICK_THRESHOLD_PX) return;

    const hitRoi = rois?.find((roi) => {
      const inner = roi.innerROI;
      if (!inner) return false;
      const { x, y, width, height } = inner;
      return (
        down.imagePt.x >= x &&
        down.imagePt.x < x + width &&
        down.imagePt.y >= y &&
        down.imagePt.y < y + height
      );
    });

    if (hitRoi && e.shiftKey) {
      onSelectRoi?.(hitRoi.id);
      return;
    }

    onRoiClick(down.imagePt.x, down.imagePt.y);
  };

  if (!raw) {
    return (
      <div className="gq-viewer gq-viewer--empty">
        <p>Upload a gel image to begin</p>
        <p className="gq-viewer__hint">Click bands to create ROIs · Shift+click to select</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="gq-viewer"
      data-tour="gq-viewer"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{ cursor: spaceDown || isPanning ? 'grab' : 'crosshair' }}
    >
      <div
        className="gq-viewer__stage"
        style={{
          transform: `translate(${transform.offsetX}px, ${transform.offsetY}px) scale(${transform.scale})`,
          transformOrigin: '0 0',
          width: imageWidth,
          height: imageHeight,
        }}
      >
        <canvas
          ref={canvasRef}
          width={imageWidth}
          height={imageHeight}
          className={`gq-viewer__image${inverted ? ' gq-viewer__image--inverted' : ''}`}
        />
        <RoiOverlay
          rois={rois}
          activeRoiId={activeRoiId}
          width={imageWidth}
          height={imageHeight}
        />
      </div>
      <div className="gq-viewer__zoom-badge">{Math.round(transform.scale * 100)}%</div>
      <div className="gq-viewer__hint-badge">Target / Control click · Shift+click select · Space+drag pan</div>
    </div>
  );
}
