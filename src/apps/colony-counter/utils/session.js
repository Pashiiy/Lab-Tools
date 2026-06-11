export const AUTOSAVE_KEY = 'colonyCounter_autosave';

export function getAutosaveKey(instanceId) {
  return `${AUTOSAVE_KEY}_${instanceId}`;
}
export const SESSION_VERSION = 1;

export function formatTimeAgo(dateStr) {
  if (!dateStr) return 'recently';
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (hours < 48) return 'yesterday';
  return date.toLocaleDateString();
}

export function buildSessionObject({
  image,
  dots,
  categories,
  activeCategory,
  dotRadius,
  opacity,
  dilutionMode,
  dilutionExponent,
  customDilution,
  volumeMl,
  sessionName,
}) {
  return {
    version: SESSION_VERSION,
    savedAt: new Date().toISOString(),
    imageName: image?.name || `${sessionName || 'colony-session'}.jpg`,
    imageData: image?.src,
    dots,
    categories,
    activeCategory,
    dotRadius,
    opacity,
    cfu: {
      dilutionMode,
      dilutionExponent:
        dilutionMode === 'preset' ? -dilutionExponent : null,
      customDilution:
        dilutionMode === 'custom' ? customDilution || null : null,
      volumeMl,
    },
  };
}

export function validateSession(session) {
  return !!(session && session.version && session.imageData);
}

export function syncDotIdCounter(dots) {
  let max = 0;
  dots.forEach((dot) => {
    if (typeof dot.id === 'number') {
      max = Math.max(max, dot.id);
    } else if (typeof dot.id === 'string') {
      const match = dot.id.match(/(\d+)$/);
      if (match) max = Math.max(max, parseInt(match[1], 10));
    }
  });
  return max + 1;
}

export function triggerJsonDownload(jsonContent, filename) {
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
