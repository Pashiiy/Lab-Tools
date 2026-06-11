export default function TabBar({ tabs, tabLabels, activeTabId, onSelectTab, onCloseTab }) {
  if (tabs.length === 0) return null;

  return (
    <div className="shell-tabs" role="tablist" aria-label="Open tool sessions">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            className={`shell-tabs__tab${isActive ? ' shell-tabs__tab--active' : ''}`}
          >
            <button
              type="button"
              className="shell-tabs__label"
              onClick={() => onSelectTab(tab.id)}
              title={tabLabels[tab.id]}
            >
              {tabLabels[tab.id]}
            </button>
            <button
              type="button"
              className="shell-tabs__close"
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              aria-label={`Close ${tabLabels[tab.id]}`}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
