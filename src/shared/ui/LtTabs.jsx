/**
 * Unified horizontal tab bar — use for all in-tool view switching.
 * Matches shell session tabs visually (underline indicator, dense sizing).
 */
export default function LtTabs({ tabs, activeId, onChange, className = '', ariaLabel = 'Views' }) {
  return (
    <div className={`lt-tabs ${className}`.trim()} role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`lt-tabs__tab${active ? ' lt-tabs__tab--active' : ''}${tab.disabled ? ' lt-tabs__tab--disabled' : ''}`}
            disabled={tab.disabled}
            title={tab.title}
            onClick={() => !tab.disabled && onChange(tab.id)}
          >
            {tab.label}
            {tab.badge != null && (
              <span className="lt-tabs__badge">{tab.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
