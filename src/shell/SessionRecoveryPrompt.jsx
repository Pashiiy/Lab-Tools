import { TOOLS } from './toolRegistry';

function describe(project) {
  const tabs = project?.workspace?.tabs ?? [];
  const names = tabs.map((t) => TOOLS[t.toolId]?.name ?? t.toolId);
  const when = project?.metadata?.lastModifiedAt
    ? new Date(project.metadata.lastModifiedAt).toLocaleString()
    : 'recently';
  const crashed = project?.session?.reason === 'crash';
  return { count: tabs.length, names, when, crashed };
}

/**
 * Crash recovery banner. Shown on startup when an autosaved workspace exists
 * but the previous shutdown was not clean (crash / force-quit / tab killed).
 *
 * Normal refresh / close restores silently — this prompt appears only for
 * unexpected shutdowns.
 */
export default function SessionRecoveryPrompt({ project, onRestore, onDismiss }) {
  if (!project) return null;
  const { count, names, when, crashed } = describe(project);

  return (
    <div className="session-recovery" role="dialog" aria-label="Restore previous session">
      <div className="session-recovery__body">
        <div className="session-recovery__icon" aria-hidden>↻</div>
        <div className="session-recovery__text">
          <h3 className="session-recovery__title">
            {crashed ? 'Recover unsaved work?' : 'Restore your last session?'}
          </h3>
          <p className="session-recovery__detail">
            {crashed
              ? 'Lab Tools closed unexpectedly. '
              : ''}
            {count} tab{count !== 1 ? 's' : ''} ({names.join(', ')}) · autosaved {when}
          </p>
        </div>
      </div>
      <div className="session-recovery__actions">
        <button type="button" className="session-recovery__btn session-recovery__btn--ghost" onClick={onDismiss}>
          Start fresh
        </button>
        <button type="button" className="session-recovery__btn session-recovery__btn--primary" onClick={onRestore}>
          {crashed ? 'Recover session' : 'Restore session'}
        </button>
      </div>
    </div>
  );
}
