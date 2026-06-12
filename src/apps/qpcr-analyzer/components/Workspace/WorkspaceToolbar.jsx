const ADVANCED_MODES = [
  { id: 'raw', label: 'Raw Data' },
  { id: 'averaged', label: 'Averaged' },
  { id: 'ddct', label: 'ΔΔCt' },
  { id: 'results', label: 'Results Table' },
  { id: 'method', label: 'Method' },
];

export default function WorkspaceToolbar({ advancedMode, onSelectMode }) {
  return (
    <nav className="ws-toolbar" aria-label="Advanced analysis views" data-tour="qpcr-toolbar">
      <span className="ws-toolbar__label">Tables &amp; Protocol:</span>
      {ADVANCED_MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          className={`ws-toolbar__btn${advancedMode === m.id ? ' ws-toolbar__btn--active' : ''}`}
          onClick={() => onSelectMode(advancedMode === m.id ? null : m.id)}
        >
          {m.label}
        </button>
      ))}
    </nav>
  );
}
