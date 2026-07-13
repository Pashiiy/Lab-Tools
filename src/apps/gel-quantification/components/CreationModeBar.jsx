export default function CreationModeBar({
  creationMode,
  CREATION_MODES,
  incompletePair,
  onModeChange,
}) {
  const waitingForControl = !!incompletePair;

  return (
    <div className="gq-creation-bar">
      <span className="gq-creation-bar__label">Click mode</span>
      <div className="gq-creation-bar__modes">
        <button
          type="button"
          className={`lt-btn lt-btn--small${creationMode === CREATION_MODES.TARGET ? ' lt-btn--active gq-mode--target' : ''}`}
          onClick={() => onModeChange(CREATION_MODES.TARGET)}
        >
          Target
        </button>
        <button
          type="button"
          className={`lt-btn lt-btn--small${creationMode === CREATION_MODES.CONTROL ? ' lt-btn--active gq-mode--control' : ''}`}
          onClick={() => onModeChange(CREATION_MODES.CONTROL)}
        >
          Control
        </button>
      </div>
      <span className="gq-creation-bar__hint">
        {waitingForControl
          ? `Next: click Control for ${incompletePair.name}`
          : 'Click Target on a band, then Control on its reference band'}
      </span>
    </div>
  );
}
