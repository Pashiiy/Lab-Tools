import HomePage from './HomePage';
import TabBar from './TabBar';
import ThemeToggle from './ThemeToggle';
import { useTabManager } from './useTabManager';
import { useGlobalTheme } from '../shared/useGlobalTheme';
import { TOOLS } from './toolRegistry';
import './shell.css';

export default function AppShell() {
  const { theme, toggleTheme } = useGlobalTheme();
  const {
    tabs,
    tabLabels,
    activeTabId,
    view,
    openTool,
    selectTab,
    closeTab,
    goHome,
  } = useTabManager();

  return (
    <div className="shell">
      <nav className="shell-nav">
        <button
          type="button"
          className={`shell-nav__home${view === 'home' ? ' shell-nav__home--active' : ''}`}
          onClick={goHome}
          aria-label="Home"
          title="Home"
        >
          Home
        </button>
        <TabBar
          tabs={tabs}
          tabLabels={tabLabels}
          activeTabId={activeTabId}
          onSelectTab={selectTab}
          onCloseTab={closeTab}
        />
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </nav>

      <div className="shell-content">
        {view === 'home' && <HomePage onOpenTool={openTool} />}

        {tabs.map((tab) => {
          const ToolComponent = TOOLS[tab.toolId]?.component;
          if (!ToolComponent) return null;

          const isVisible = view === 'tool' && activeTabId === tab.id;

          return (
            <div
              key={tab.id}
              className="shell-tab-panel"
              role="tabpanel"
              aria-hidden={!isVisible}
              style={{ display: isVisible ? 'flex' : 'none' }}
            >
              <ToolComponent instanceId={tab.id} isActive={isVisible} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
