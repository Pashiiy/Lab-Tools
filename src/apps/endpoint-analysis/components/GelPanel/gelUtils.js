export function getImageStyle(gel) {
  return {
    filter: [
      `brightness(${gel.brightness}%)`,
      `contrast(${gel.contrast}%)`,
      gel.shadows > 0
        ? `drop-shadow(0 0 ${Math.round(gel.shadows / 10)}px rgba(0,0,0,${gel.shadows / 100}))`
        : '',
    ]
      .filter(Boolean)
      .join(' '),
    transform: `translate(${gel.panX}px, ${gel.panY}px) rotate(${gel.rotation}deg) scale(${gel.zoom / 100})`,
    transformOrigin: 'center center',
    transition: 'filter 0.1s, transform 0.1s',
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  };
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function handleWheelZoom(e, gel, containerEl, onUpdate) {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -5 : 5;
  const oldZoom = gel.zoom;
  const newZoom = clamp(oldZoom + delta, 50, 300);
  if (newZoom === oldZoom) return;

  const rect = containerEl.getBoundingClientRect();
  const mx = e.clientX - rect.left - rect.width / 2;
  const my = e.clientY - rect.top - rect.height / 2;
  const scale = newZoom / oldZoom;

  onUpdate('zoom', newZoom);
  if (newZoom === 100) {
    onUpdate('panX', 0);
    onUpdate('panY', 0);
  } else {
    onUpdate('panX', gel.panX * scale + mx * (1 - scale));
    onUpdate('panY', gel.panY * scale + my * (1 - scale));
  }
}
