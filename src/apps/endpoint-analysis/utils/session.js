export const AUTOSAVE_KEY = 'endpointAnalysis_autosave';
export const SESSION_VERSION = 1;

export function getAutosaveKey(instanceId) {
  return `${AUTOSAVE_KEY}_${instanceId}`;
}

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
  strainName,
  colonyCount,
  gels,
  colonies,
  activeTab,
}) {
  return {
    version: SESSION_VERSION,
    savedAt: new Date().toISOString(),
    strainName,
    colonyCount,
    gels,
    colonies: colonies.map(({ id, galcen, cen3, rearrangement, reciprocal }) => ({
      id,
      galcen,
      cen3,
      rearrangement,
      reciprocal,
    })),
    activeTab,
  };
}

export function validateSession(session) {
  if (!session || session.version !== SESSION_VERSION) return false;

  if (session.strainName?.trim()) return true;

  if (
    session.gels &&
    Object.values(session.gels).some((gel) => gel?.src)
  ) {
    return true;
  }

  if (
    session.colonies?.some(
      (c) => c.galcen || c.cen3 || c.rearrangement || c.reciprocal
    )
  ) {
    return true;
  }

  if (session.colonyCount && session.colonyCount !== 30) return true;

  return false;
}

export function normalizeGels(gels) {
  const keys = ['galcen', 'cen3', 'rearrangement', 'reciprocal'];
  const normalized = {};
  keys.forEach((key) => {
    const gel = gels?.[key] || {};
    normalized[key] = {
      src: null,
      name: null,
      brightness: 100,
      contrast: 100,
      shadows: 0,
      rotation: 90,
      zoom: 100,
      panX: 0,
      panY: 0,
      ...gel,
      loading: false,
      error: null,
    };
  });
  return normalized;
}
