/**
 * User-facing product identity (Benchy rebrand).
 * Keep storage key strings elsewhere unless migrating user data intentionally.
 */
export const APP_NAME = 'Benchy';
export const APP_TAGLINE = 'Scientific Image Analysis & Research Workspace';
export const APP_DESCRIPTION =
  'Benchy is a scientific image analysis and research management platform designed for laboratory workflows.';
export const APP_SHORT_DESCRIPTION =
  'Scientific image analysis and research workspace for laboratory workflows.';

/** Window / document title helpers */
export function windowTitle(section) {
  if (!section) return APP_NAME;
  return `${APP_NAME} — ${section}`;
}
