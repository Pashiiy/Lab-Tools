export default function AdvancedPanel({ mode, onClose, children }) {
  if (!mode) return null;

  const titles = {
    raw: 'Raw Data',
    averaged: 'Averaged',
    ddct: 'ΔΔCt Analysis',
    results: 'Detailed Results',
    method: 'Run Method',
  };

  return (
    <div className="ws-advanced-overlay">
      <div className="ws-advanced-panel">
        <header className="ws-advanced-header">
          <h2>{titles[mode] || mode}</h2>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Back to Workspace
          </button>
        </header>
        <div className="ws-advanced-body">{children}</div>
      </div>
    </div>
  );
}
