import { useState } from 'react';
import { SIDEBAR_NAV } from './sidebarNav';
import { ToolIcon } from './ToolIcons';

function NavIcon({ name }) {
  const icons = {
    dashboard: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    tools: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
      </svg>
    ),
    settings: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    ),
  };
  if (icons[name]) return icons[name];
  return <ToolIcon name={name} />;
}

export default function Sidebar({
  view,
  activeToolId,
  onGoHome,
  onOpenTool,
  onOpenSettings,
}) {
  const [toolsExpanded, setToolsExpanded] = useState(true);

  const isActive = (item) => {
    if (item.action === 'home') return view === 'home';
    if (item.action === 'settings') return false;
    if (item.toolId) return view === 'tool' && activeToolId === item.toolId;
    return false;
  };

  const handleClick = (item) => {
    if (item.action === 'home') onGoHome();
    else if (item.action === 'settings') onOpenSettings();
    else if (item.toolId) onOpenTool(item.toolId);
  };

  return (
    <aside className="shell-sidebar" aria-label="Application navigation">
      <div className="shell-sidebar__brand">
        <span className="shell-sidebar__brand-mark" aria-hidden />
        <div className="shell-sidebar__brand-text">
          <span className="shell-sidebar__brand-name">Lab Tools</span>
          <span className="shell-sidebar__brand-sub">Bloom Lab</span>
        </div>
      </div>

      <nav className="shell-sidebar__nav">
        {SIDEBAR_NAV.map((item, i) => {
          if (item.type === 'divider') {
            return <div key={`div-${i}`} className="shell-sidebar__divider" />;
          }

          if (item.type === 'group') {
            return (
              <div key={item.id} className="shell-sidebar__group">
                <button
                  type="button"
                  className="shell-sidebar__group-toggle"
                  onClick={() => setToolsExpanded((v) => !v)}
                  aria-expanded={toolsExpanded}
                >
                  <span className="shell-sidebar__icon"><NavIcon name={item.icon} /></span>
                  <span className="shell-sidebar__label">{item.label}</span>
                  <span className="shell-sidebar__chevron">{toolsExpanded ? '▾' : '▸'}</span>
                </button>
                <div
                  className={`shell-sidebar__children${
                    toolsExpanded ? ' shell-sidebar__children--open' : ''
                  }`}
                >
                  <div className="shell-sidebar__children-inner">
                    {item.children.map((child) => (
                      <button
                        key={child.id}
                        type="button"
                        className={`shell-sidebar__item shell-sidebar__item--child${
                          view === 'tool' && activeToolId === child.toolId
                            ? ' shell-sidebar__item--active'
                            : ''
                        }`}
                        onClick={() => onOpenTool(child.toolId)}
                      >
                        <span className="shell-sidebar__icon shell-sidebar__icon--sm">
                          <NavIcon name={child.icon} />
                        </span>
                        <span className="shell-sidebar__label">{child.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          }

          const active = isActive(item);
          return (
            <button
              key={item.id}
              type="button"
              className={`shell-sidebar__item${active ? ' shell-sidebar__item--active' : ''}`}
              onClick={() => handleClick(item)}
            >
              <span className="shell-sidebar__icon"><NavIcon name={item.icon} /></span>
              <span className="shell-sidebar__label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
