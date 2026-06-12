const BASE_TABS = [
  { id: 'plate', label: 'Plate Setup' },
  { id: 'amplification', label: 'Amplification' },
  { id: 'method', label: 'Method' },
  { id: 'run', label: 'Run Summary' },
  { id: 'raw', label: 'Raw Data' },
  { id: 'averaged', label: 'Averaged' },
  { id: 'ddct', label: 'ΔΔCt' },
  { id: 'results', label: 'Results' },
];

export default function ViewTabs({ activeView, onChange, hasStandardCurve }) {
  const tabs = hasStandardCurve
    ? [...BASE_TABS, { id: 'standard-curve', label: 'Standard Curve' }]
    : BASE_TABS;

  return (
    <nav className="view-tabs view-tabs--scroll" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeView === tab.id}
          className={`view-tab${activeView === tab.id ? ' view-tab--active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
