import { useRef, useEffect, useCallback, useState } from 'react';
import { hexToRgba } from '../hooks/useColonyCounter';
import ZoomControls from './ZoomControls';

const MIN_SCALE = 0.5;
const MAX_SCALE = 8;
const TAP_MAX_MS = 300;
const TAP_MAX_PX = 10;
const LONG_PRESS_MS = 500;

function getPinchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

export default function CanvasView({
  image,
  dots,
  opacity,
  onAddDot,
  onRemoveDot,
  findDotAt,
}) {
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoveredDotRef = useRef(null);
  const didPanRef = useRef(false);

  const touchStartRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const lastPinchDistanceRef = useRef(null);
  const longPressHandledRef = useRef(false);
  const touchPanningRef = useRef(false);
  const touchPanStartRef = useRef(null);

  const [transform, setTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  const [spaceDown, setSpaceDown] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  const fitToWindow = useCallback(() => {
    const container = containerRef.current;
    if (!container || !image) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const scale = Math.min(cw / image.naturalWidth, ch / image.naturalHeight);
    const offsetX = (cw - image.naturalWidth * scale) / 2;
    const offsetY = (ch - image.naturalHeight * scale) / 2;
    setTransform({ scale, offsetX, offsetY });
  }, [image]);

  useEffect(() => {
    fitToWindow();
    const handleResize = () => fitToWindow();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fitToWindow]);

  const getImageCoords = useCallback(
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
      const newOffsetX = anchorX - (anchorX - prev.offsetX) * (newScale / prev.scale);
      const newOffsetY = anchorY - (anchorY - prev.offsetY) * (newScale / prev.scale);
      return { scale: newScale, offsetX: newOffsetX, offsetY: newOffsetY };
    });
  }, []);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleWheel = useCallback(
    (e) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      zoomAt(zoomFactor, mouseX, mouseY);
    },
    [zoomAt]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setSpaceDown(true);
      }
    };
    const onKeyUp = (e) => {
      if (e.code === 'Space') {
        setSpaceDown(false);
        setIsPanning(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    dots.forEach((dot) => {
      const isHovered = hoveredDotRef.current === dot.id;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.radius, 0, 2 * Math.PI);
      ctx.fillStyle = hexToRgba(dot.color, opacity);
      ctx.fill();
      ctx.strokeStyle = isHovered
        ? 'rgba(255,255,255,0.9)'
        : 'rgba(255,255,255,0.6)';
      ctx.lineWidth = isHovered ? 2.5 : 1.5;
      ctx.stroke();

      if (isHovered) {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.radius + 3, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
  }, [dots, opacity]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    return () => clearLongPressTimer();
  }, [clearLongPressTimer]);

  const handleImageLoad = () => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    redraw();
    fitToWindow();
  };

  const updateCursor = useCallback((hit, panning, space) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (panning) {
      canvas.style.cursor = 'grabbing';
    } else if (space) {
      canvas.style.cursor = 'grab';
    } else if (hit) {
      canvas.style.cursor = 'pointer';
    } else {
      canvas.style.cursor = 'crosshair';
    }
  }, []);

  useEffect(() => {
    const onMouseUp = () => {
      if (isPanning) {
        setIsPanning(false);
        updateCursor(null, false, spaceDown);
      }
    };
    window.addEventListener('mouseup', onMouseUp);
    return () => window.removeEventListener('mouseup', onMouseUp);
  }, [isPanning, spaceDown, updateCursor]);

  const handleMouseDown = (e) => {
    const isMiddle = e.button === 1;
    const isSpacePan = spaceDown && e.button === 0;
    if (isMiddle || isSpacePan) {
      e.preventDefault();
      didPanRef.current = false;
      setIsPanning(true);
      setPanStart({
        x: e.clientX,
        y: e.clientY,
        offsetX: transform.offsetX,
        offsetY: transform.offsetY,
      });
      updateCursor(null, true, spaceDown);
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      didPanRef.current = true;
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setTransform((prev) => ({
        ...prev,
        offsetX: panStart.offsetX + dx,
        offsetY: panStart.offsetY + dy,
      }));
      return;
    }

    const coords = getImageCoords(e.clientX, e.clientY);
    if (!coords) return;
    const hit = findDotAt(coords.x, coords.y);
    const prevHovered = hoveredDotRef.current;
    const newHovered = hit ? hit.id : null;

    if (prevHovered !== newHovered) {
      hoveredDotRef.current = newHovered;
      updateCursor(hit, false, spaceDown);
      redraw();
    } else if (spaceDown) {
      updateCursor(hit, false, true);
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      updateCursor(null, false, spaceDown);
    }
  };

  const handleMouseLeave = () => {
    if (isPanning) return;
    if (hoveredDotRef.current !== null) {
      hoveredDotRef.current = null;
      updateCursor(null, false, spaceDown);
      redraw();
    }
  };

  const handleClick = (e) => {
    if (spaceDown || isPanning || didPanRef.current) return;
    if (e.button !== 0) return;
    const coords = getImageCoords(e.clientX, e.clientY);
    if (!coords) return;
    const hit = findDotAt(coords.x, coords.y);
    if (!hit) {
      onAddDot(coords.x, coords.y);
    }
  };

  const handleContextMenu = (e) => {
    if (spaceDown) return;
    e.preventDefault();
    const coords = getImageCoords(e.clientX, e.clientY);
    if (!coords) return;
    const hit = findDotAt(coords.x, coords.y);
    if (hit) {
      onRemoveDot(hit.id);
    }
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      clearLongPressTimer();
      touchPanningRef.current = false;
      touchStartRef.current = null;
      lastPinchDistanceRef.current = getPinchDistance(e.touches);
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      longPressHandledRef.current = false;
      touchPanningRef.current = false;
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      touchPanStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        offsetX: transform.offsetX,
        offsetY: transform.offsetY,
      };

      clearLongPressTimer();
      longPressTimerRef.current = setTimeout(() => {
        const coords = getImageCoords(touch.clientX, touch.clientY);
        if (!coords) return;
        const hit = findDotAt(coords.x, coords.y);
        if (hit) {
          onRemoveDot(hit.id);
          longPressHandledRef.current = true;
          if (navigator.vibrate) navigator.vibrate(40);
        }
      }, LONG_PRESS_MS);
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();

    if (e.touches.length === 2) {
      clearLongPressTimer();
      const container = containerRef.current;
      if (!container) return;

      const currentDistance = getPinchDistance(e.touches);
      if (lastPinchDistanceRef.current) {
        const zoomFactor = currentDistance / lastPinchDistanceRef.current;
        const rect = container.getBoundingClientRect();
        const midX =
          (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const midY =
          (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

        setTransform((prev) => {
          const newScale = Math.min(
            Math.max(prev.scale * zoomFactor, MIN_SCALE),
            MAX_SCALE
          );
          const newOffsetX =
            midX - (midX - prev.offsetX) * (newScale / prev.scale);
          const newOffsetY =
            midY - (midY - prev.offsetY) * (newScale / prev.scale);
          return { scale: newScale, offsetX: newOffsetX, offsetY: newOffsetY };
        });
      }
      lastPinchDistanceRef.current = currentDistance;
      return;
    }

    if (e.touches.length === 1 && touchStartRef.current) {
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > TAP_MAX_PX) {
        clearLongPressTimer();
        if (!touchPanningRef.current) {
          touchPanningRef.current = true;
          touchPanStartRef.current = {
            x: touch.clientX,
            y: touch.clientY,
            offsetX: transform.offsetX,
            offsetY: transform.offsetY,
          };
        } else if (touchPanStartRef.current) {
          const pdx = touch.clientX - touchPanStartRef.current.x;
          const pdy = touch.clientY - touchPanStartRef.current.y;
          setTransform((prev) => ({
            ...prev,
            offsetX: touchPanStartRef.current.offsetX + pdx,
            offsetY: touchPanStartRef.current.offsetY + pdy,
          }));
        }
      }
    }
  };

  const handleTouchEnd = (e) => {
    clearLongPressTimer();

    if (e.touches.length > 0) {
      return;
    }

    lastPinchDistanceRef.current = null;

    if (longPressHandledRef.current) {
      longPressHandledRef.current = false;
      touchStartRef.current = null;
      touchPanningRef.current = false;
      return;
    }

    if (touchPanningRef.current) {
      touchPanningRef.current = false;
      touchStartRef.current = null;
      return;
    }

    if (!touchStartRef.current || e.changedTouches.length === 0) {
      touchStartRef.current = null;
      return;
    }

    const touch = e.changedTouches[0];
    const elapsed = Date.now() - touchStartRef.current.time;
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (
      elapsed < TAP_MAX_MS &&
      distance < TAP_MAX_PX &&
      !isPanning
    ) {
      const coords = getImageCoords(touch.clientX, touch.clientY);
      if (coords) {
        const hit = findDotAt(coords.x, coords.y);
        if (!hit) {
          onAddDot(coords.x, coords.y);
        }
      }
    }

    touchStartRef.current = null;
  };

  const handleTouchCancel = () => {
    clearLongPressTimer();
    touchStartRef.current = null;
    touchPanningRef.current = false;
    lastPinchDistanceRef.current = null;
  };

  const handleZoomIn = () => {
    const container = containerRef.current;
    if (!container) return;
    zoomAt(1.1, container.clientWidth / 2, container.clientHeight / 2);
  };

  const handleZoomOut = () => {
    const container = containerRef.current;
    if (!container) return;
    zoomAt(0.9, container.clientWidth / 2, container.clientHeight / 2);
  };

  return (
    <div className="canvas-viewport-container" ref={containerRef}>
      <ZoomControls
        scale={transform.scale}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFit={fitToWindow}
      />
      <div
        className="canvas-viewport"
        style={{
          transform: `translate(${transform.offsetX}px, ${transform.offsetY}px) scale(${transform.scale})`,
          transformOrigin: '0 0',
        }}
      >
        <div
          className="canvas-view"
          style={{
            width: image.naturalWidth,
            height: image.naturalHeight,
          }}
        >
          <img
            ref={imageRef}
            src={image.src}
            alt="Petri dish"
            className="canvas-view__image"
            width={image.naturalWidth}
            height={image.naturalHeight}
            onLoad={handleImageLoad}
            draggable={false}
          />
          <canvas
            ref={canvasRef}
            className="canvas-view__canvas"
            style={{ touchAction: 'none' }}
            onMouseDown={handleMouseDown}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
          />
        </div>
      </div>
    </div>
  );
}
