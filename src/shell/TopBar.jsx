import { useMemo, useState } from 'react';
import TabBar from './TabBar';
import ThemeToggle from './ThemeToggle';
import NavUtilityButtons from './NavUtilityButtons';
import ToolHelpButton from '../help/components/ToolHelpButton';
import { useToolHelp } from '../help/ToolHelpContext';
import { hasHelpContent } from '../help/helpRegistry';
import { TOOL_LIST } from './toolRegistry';
import { getActiveTools } from './toolManifest';

export default function TopBar({
  theme,
  onToggleTheme,
  tabs,
  tabLabels,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onOpenTool,
  notepadOpen,
  strainOpen,
  onToggleNotepad,
  onToggleStrain,
  view,
  activeToolId,
}) {
  const { openHelp } = useToolHelp();
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const isHome = view === 'home';

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return getActiveTools(TOOL_LIST).filter((t) =>
      [t.name, t.description, t.id].join(' ').toLowerCase().includes(q)
    ).slice(0, 6);
  }, [search]);

  const handleSearchSelect = (toolId) => {
    onOpenTool(toolId);
    setSearch('');
    setSearchOpen(false);
  };

  const showResults = searchOpen && search.trim() && searchResults.length > 0;

  return (
    <header className={`shell-topbar${isHome ? ' shell-topbar--home' : ''}`}>
      <div className="shell-topbar__left">
        {isHome ? (
          <div className="shell-topbar__brand">
            <span className="shell-topbar__brand-mark" aria-hidden />
            <span className="shell-topbar__brand-name">Lab Tools</span>
          </div>
        ) : (
          <>
            <TabBar
              tabs={tabs}
              tabLabels={tabLabels}
              activeTabId={activeTabId}
              onSelectTab={onSelectTab}
              onCloseTab={onCloseTab}
            />
          </>
        )}
        {isHome && tabs.length > 0 && (
          <TabBar
            tabs={tabs}
            tabLabels={tabLabels}
            activeTabId={activeTabId}
            onSelectTab={onSelectTab}
            onCloseTab={onCloseTab}
          />
        )}
      </div>

      <div className="shell-topbar__center">
        <div className={`shell-topbar__search${search ? ' shell-topbar__search--active' : ''}`}>
          <svg className="shell-topbar__search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3-3" />
          </svg>
          <input
            type="search"
            className="shell-topbar__search-input lt-input"
            placeholder="Search modules…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 160)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchResults[0]) {
                handleSearchSelect(searchResults[0].id);
              }
            }}
          />
          {showResults && (
            <ul className="shell-topbar__search-results shell-topbar__search-results--visible">
              {searchResults.map((tool, i) => (
                <li
                  key={tool.id}
                  className="shell-topbar__search-item"
                  style={{ '--result-stagger': i }}
                >
                  <button type="button" onMouseDown={() => handleSearchSelect(tool.id)}>
                    <span className="shell-topbar__search-name">{tool.name}</span>
                    <span className="shell-topbar__search-desc">{tool.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="shell-topbar__right">
        {view === 'tool' && activeToolId && hasHelpContent(activeToolId) && (
          <ToolHelpButton className="shell-topbar__help" onClick={openHelp} />
        )}
        <NavUtilityButtons
          notepadOpen={notepadOpen}
          strainOpen={strainOpen}
          onToggleNotepad={onToggleNotepad}
          onToggleStrain={onToggleStrain}
        />
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}
