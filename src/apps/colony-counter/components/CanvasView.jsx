import { useRef, useEffect, useCallback, useState } from 'react';
import { hexToRgba } from '../hooks/useColonyCounter';
import { isEditableTarget } from '../../../shared/input/isEditableTarget';
import { COLONY_TYPE_META } from '../utils/categories';
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

function strokeForDot(dot, isHovered) {
  if (isHovered) return 'rgba(255,255,255,0.9)';
  const meta = COLONY_TYPE_META[dot.colonyType];
  if (meta?.stroke) return meta.stroke;
  const auto = dot.source === 'auto' && !dot.manuallyAdded;
  return auto ? 'rgba(180,220,255,0.75)' : 'rgba(255,255,255,0.6)';
}

/**
 * Colony canvas interaction.
 *
 * Pan is a temporary gesture (middle-button or Space+drag), never a sticky mode.
 * `didPanRef` only suppresses the click that follows a pan, then clears.
 *
 * Mask modes (`mask-ellipse` / `mask-polygon`) are additive — when mode is `mark`
 * (default), behavior matches the original manual counter.
 */
export default function CanvasView({
  image,
  dots,
  opacity,
  onAddDot,
  onRemoveDot,
  onMoveDot,
  findDotAt,
  isActive = true,
  interactionMode = 'mark',
  mask = null,
  draftPolygon = null,
  onMaskChange,
  onDraftPolygonChange,
  clusters = null,
  onEditClusterCount,
}) {
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const hoveredDotRef = useRef(null);
  const didPanRef = useRef(false);
  const didDragDotRef = useRef(false);
  const isPanningRef = useRef(false);
  const spaceDownRef = useRef(false);
  const panStartRef = useRef(null);
  const panPointerIdRef = useRef(null);
  const dragDotRef = useRef(null);
  const ellipseDragRef = useRef(null);

  const touchStartRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const lastPinchDistanceRef = useRef(null);
  const longPressHandledRef = useRef(false);
  const touchPanningRef = useRef(false);
  const touchPanStartRef = useRef(null);

  const [transform, setTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  const masking = interactionMode === 'mask-ellipse' || interactionMode === 'mask-polygon';

  const viewWidth = image?.displayWidth ?? image?.naturalWidth ?? 0;
  const viewHeight = image?.displayHeight ?? image?.naturalHeight ?? 0;

  const fitToWindow = useCallback(() => {
    const container = containerRef.current;
    if (!container || !image) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const scale = Math.min(cw / viewWidth, ch / viewHeight);
    const offsetX = (cw - viewWidth * scale) / 2;
    const offsetY = (ch - viewHeight * scale) / 2;
    setTransform({ scale, offsetX, offsetY });
  }, [image, viewWidth, viewHeight]);

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

  const updateCursor = useCallback((hit, panning, space, moving) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (panning) {
      canvas.style.cursor = 'grabbing';
    } else if (moving) {
      canvas.style.cursor = 'move';
    } else if (space) {
      canvas.style.cursor = 'grab';
    } else if (hit) {
      canvas.style.cursor = 'pointer';
    } else {
      canvas.style.cursor = 'crosshair';
    }
  }, []);

  const endPan = useCallback(() => {
    if (!isPanningRef.current) return;
    isPanningRef.current = false;
    panStartRef.current = null;
    panPointerIdRef.current = null;
    updateCursor(null, false, spaceDownRef.current);
  }, [updateCursor]);

  const clearTransientInput = useCallback(() => {
    spaceDownRef.current = false;
    endPan();
    updateCursor(null, false, false);
  }, [endPan, updateCursor]);

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

  // Space-to-pan only while this tool tab is active; never while typing.
  useEffect(() => {
    if (!isActive) {
      clearTransientInput();
      return undefined;
    }

    const onKeyDown = (e) => {
      if (e.code !== 'Space') return;
      if (e.repeat) return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      spaceDownRef.current = true;
      updateCursor(null, isPanningRef.current, true);
    };
    const onKeyUp = (e) => {
      if (e.code !== 'Space') return;
      spaceDownRef.current = false;
      // Space release must not leave pan mode if middle-button pan is still held.
      if (!isPanningRef.current) {
        updateCursor(null, false, false);
      }
    };
    const onBlur = () => clearTransientInput();
    const onVisibility = () => {
      if (document.hidden) clearTransientInput();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      clearTransientInput();
    };
  }, [isActive, clearTransientInput, updateCursor]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawMaskShape = (m, fill = 'rgba(47, 111, 237, 0.18)', stroke = 'rgba(120, 170, 255, 0.95)') => {
      if (!m) return;
      ctx.save();
      if (m.type === 'ellipse') {
        ctx.beginPath();
        ctx.ellipse(m.cx, m.cy, m.rx, m.ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (m.type === 'polygon' && m.points?.length) {
        ctx.beginPath();
        m.points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        if (m.points.length >= 3) {
          ctx.closePath();
          ctx.fillStyle = fill;
          ctx.fill();
        }
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        for (const p of m.points) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = stroke;
          ctx.fill();
        }
      }
      ctx.restore();
    };

    if (mask) drawMaskShape(mask);
    if (draftPolygon?.length) {
      drawMaskShape({ type: 'polygon', points: draftPolygon }, 'rgba(47, 111, 237, 0.08)');
    }

    // Fused-cluster overlays (hatched region + count badge — not fake markers)
    if (clusters?.length) {
      for (const cl of clusters) {
        const pts = cl.contour;
        if (!pts?.length) continue;
        const meta = COLONY_TYPE_META[cl.colonyType] || COLONY_TYPE_META.yeast;
        ctx.save();
        ctx.beginPath();
        pts.forEach((p, i) => {
          const x = Array.isArray(p) ? p[0] : p.x;
          const y = Array.isArray(p) ? p[1] : p.y;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fillStyle =
          cl.colonyType === 'contaminant'
            ? 'rgba(225, 29, 72, 0.22)'
            : cl.colonyType === 'uncertain'
              ? 'rgba(245, 158, 11, 0.22)'
              : 'rgba(148, 163, 184, 0.22)';
        ctx.fill();
        ctx.strokeStyle = meta.stroke || 'rgba(200,200,210,0.9)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Hatch
        ctx.clip();
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        const xs = pts.map((p) => (Array.isArray(p) ? p[0] : p.x));
        const ys = pts.map((p) => (Array.isArray(p) ? p[1] : p.y));
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        for (let x = minX - (maxY - minY); x < maxX + (maxY - minY); x += 10) {
          ctx.beginPath();
          ctx.moveTo(x, minY);
          ctx.lineTo(x + (maxY - minY), maxY);
          ctx.stroke();
        }
        ctx.restore();

        const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
        const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
        const label = String(cl.estimatedCount ?? 0);
        ctx.font = 'bold 13px IBM Plex Sans, system-ui, sans-serif';
        const tw = ctx.measureText(label).width;
        const bw = tw + 14;
        const bh = 22;
        ctx.fillStyle = 'rgba(20, 20, 28, 0.85)';
        ctx.strokeStyle = meta.stroke || '#fff';
        ctx.lineWidth = 1.5;
        const bx = cx - bw / 2;
        const by = cy - bh / 2;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(bx, by, bw, bh, 6);
        } else {
          ctx.rect(bx, by, bw, bh);
        }
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#f5f5f7';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, cx, cy + 0.5);
      }
    }

    const drag = dragDotRef.current;

    dots.forEach((dot) => {
      const isDragging = drag && drag.id === dot.id;
      const x = isDragging ? drag.x : dot.x;
      const y = isDragging ? drag.y : dot.y;
      const isHovered = hoveredDotRef.current === dot.id;
      ctx.beginPath();
      ctx.arc(x, y, dot.radius, 0, 2 * Math.PI);
      ctx.fillStyle = hexToRgba(dot.color, opacity);
      ctx.fill();
      const meta = COLONY_TYPE_META[dot.colonyType];
      ctx.strokeStyle = strokeForDot(dot, isHovered);
      ctx.lineWidth = isHovered || isDragging ? 2.5 : meta?.dashed ? 2 : 1.5;
      if (meta?.dashed && !isHovered) ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      if (isHovered || isDragging) {
        ctx.beginPath();
        ctx.arc(x, y, dot.radius + 3, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
  }, [dots, opacity, mask, draftPolygon, clusters]);

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

  const handlePointerDown = (e) => {
    const isMiddle = e.button === 1;
    const isSpacePan = spaceDownRef.current && e.button === 0;
    if (isMiddle || isSpacePan) {
      e.preventDefault();
      didPanRef.current = false;
      isPanningRef.current = true;
      panPointerIdRef.current = e.pointerId;
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        offsetX: transform.offsetX,
        offsetY: transform.offsetY,
      };
      updateCursor(null, true, spaceDownRef.current, false);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      return;
    }

    if (interactionMode === 'mask-ellipse' && e.button === 0) {
      const coords = getImageCoords(e.clientX, e.clientY);
      if (!coords) return;
      e.preventDefault();
      ellipseDragRef.current = { cx: coords.x, cy: coords.y, pointerId: e.pointerId };
      onMaskChange?.({ type: 'ellipse', cx: coords.x, cy: coords.y, rx: 1, ry: 1 });
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      return;
    }

    if (masking) return;

    // Left-button: start drag if on a colony marker
    if (e.button === 0 && onMoveDot) {
      const coords = getImageCoords(e.clientX, e.clientY);
      if (!coords) return;
      const hit = findDotAt(coords.x, coords.y);
      if (hit) {
        e.preventDefault();
        didDragDotRef.current = false;
        dragDotRef.current = {
          id: hit.id,
          x: hit.x,
          y: hit.y,
          pointerId: e.pointerId,
          startClientX: e.clientX,
          startClientY: e.clientY,
        };
        updateCursor(hit, false, false, true);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        redraw();
      }
    }
  };

  const handlePointerMove = (e) => {
    if (isPanningRef.current && panStartRef.current) {
      if (
        panPointerIdRef.current != null &&
        e.pointerId !== panPointerIdRef.current
      ) {
        return;
      }
      didPanRef.current = true;
      const start = panStartRef.current;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      setTransform((prev) => ({
        ...prev,
        offsetX: start.offsetX + dx,
        offsetY: start.offsetY + dy,
      }));
      return;
    }

    if (ellipseDragRef.current && ellipseDragRef.current.pointerId === e.pointerId) {
      const start = ellipseDragRef.current;
      const coords = getImageCoords(e.clientX, e.clientY);
      if (!coords) return;
      const rx = Math.max(1, Math.abs(coords.x - start.cx));
      const ry = Math.max(1, Math.abs(coords.y - start.cy));
      onMaskChange?.({ type: 'ellipse', cx: start.cx, cy: start.cy, rx, ry });
      return;
    }

    if (dragDotRef.current && dragDotRef.current.pointerId === e.pointerId) {
      const drag = dragDotRef.current;
      const dist = Math.hypot(e.clientX - drag.startClientX, e.clientY - drag.startClientY);
      if (dist > 3) didDragDotRef.current = true;
      const coords = getImageCoords(e.clientX, e.clientY);
      if (!coords) return;
      dragDotRef.current = { ...drag, x: coords.x, y: coords.y };
      updateCursor(null, false, false, true);
      redraw();
      return;
    }

    if (masking) return;

    const coords = getImageCoords(e.clientX, e.clientY);
    if (!coords) return;
    const hit = findDotAt(coords.x, coords.y);
    const prevHovered = hoveredDotRef.current;
    const newHovered = hit ? hit.id : null;

    if (prevHovered !== newHovered) {
      hoveredDotRef.current = newHovered;
      updateCursor(hit, false, spaceDownRef.current, false);
      redraw();
    } else if (spaceDownRef.current) {
      updateCursor(hit, false, true, false);
    }
  };

  const handlePointerUp = (e) => {
    if (ellipseDragRef.current && ellipseDragRef.current.pointerId === e.pointerId) {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
      ellipseDragRef.current = null;
      return;
    }

    if (dragDotRef.current && dragDotRef.current.pointerId === e.pointerId) {
      const drag = dragDotRef.current;
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
      if (didDragDotRef.current && onMoveDot) {
        onMoveDot(drag.id, drag.x, drag.y);
      }
      dragDotRef.current = null;
      updateCursor(null, false, spaceDownRef.current, false);
      redraw();
      return;
    }

    if (
      panPointerIdRef.current != null &&
      e.pointerId !== panPointerIdRef.current
    ) {
      return;
    }
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    endPan();
  };

  const handlePointerCancel = (e) => {
    if (dragDotRef.current) {
      dragDotRef.current = null;
      didDragDotRef.current = false;
      redraw();
    }
    handlePointerUp(e);
  };

  const handleMouseLeave = () => {
    if (isPanningRef.current || dragDotRef.current) return;
    if (hoveredDotRef.current !== null) {
      hoveredDotRef.current = null;
      updateCursor(null, false, spaceDownRef.current, false);
      redraw();
    }
  };

  const handleClick = (e) => {
    // Suppress click after pan or after dragging a marker
    if (didPanRef.current) {
      didPanRef.current = false;
      return;
    }
    if (didDragDotRef.current) {
      didDragDotRef.current = false;
      return;
    }
    if (spaceDownRef.current || isPanningRef.current) return;
    if (e.button !== 0) return;
    const coords = getImageCoords(e.clientX, e.clientY);
    if (!coords) return;

    if (interactionMode === 'mask-polygon') {
      const pts = draftPolygon ? [...draftPolygon] : [];
      if (pts.length >= 3) {
        const first = pts[0];
        const closeDist = Math.hypot(coords.x - first.x, coords.y - first.y);
        if (closeDist < 12 / Math.max(transform.scale, 0.01)) {
          onMaskChange?.({ type: 'polygon', points: pts });
          onDraftPolygonChange?.([]);
          return;
        }
      }
      pts.push({ x: coords.x, y: coords.y });
      onDraftPolygonChange?.(pts);
      return;
    }

    if (masking) return;

    // Click cluster badge → edit estimated count
    if (clusters?.length && onEditClusterCount) {
      for (const cl of clusters) {
        const pts = cl.contour;
        if (!pts?.length) continue;
        const xs = pts.map((p) => (Array.isArray(p) ? p[0] : p.x));
        const ys = pts.map((p) => (Array.isArray(p) ? p[1] : p.y));
        const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
        const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
        if (Math.hypot(coords.x - cx, coords.y - cy) < 18) {
          const next = window.prompt(
            'Edit estimated colony count for this fused cluster:',
            String(cl.estimatedCount ?? 0)
          );
          if (next != null && next.trim() !== '') {
            onEditClusterCount(cl.id, next);
          }
          return;
        }
      }
    }

    const hit = findDotAt(coords.x, coords.y);
    if (!hit) {
      onAddDot(coords.x, coords.y);
    }
  };

  const handleContextMenu = (e) => {
    if (spaceDownRef.current) return;
    e.preventDefault();
    if (masking) return;
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
        if (masking) return;
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
      !isPanningRef.current
    ) {
      if (masking) {
        touchStartRef.current = null;
        return;
      }
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
            width: viewWidth,
            height: viewHeight,
          }}
        >
          <img
            ref={imageRef}
            src={image.src}
            alt="Petri dish"
            className="canvas-view__image"
            width={viewWidth}
            height={viewHeight}
            onLoad={handleImageLoad}
            draggable={false}
          />
          <canvas
            ref={canvasRef}
            className="canvas-view__canvas"
            style={{ touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
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
