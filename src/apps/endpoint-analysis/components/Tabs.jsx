const TABS = [
  { id: 'score-gels', label: 'Score Gels' },
  { id: 'overview', label: 'Overview' },
];

export default function Tabs({ activeTab, onTabChange }) {
  return (
    <nav className="tabs" role="tablist" data-tour="ea-tabs">
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={activeTab === id}
          className={`tabs__tab${activeTab === id ? ' tabs__tab--active' : ''}`}
          onClick={() => onTabChange(id)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
