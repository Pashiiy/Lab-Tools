import { useState } from 'react';
import { SIDEBAR_TOOLS } from './sidebarNav';
import { ToolIcon } from './ToolIcons';
import { TOOLS } from './toolRegistry';

function formatWhen(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function SidebarSection({ label, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="shell-sidebar__section">
      <button
        type="button"
        className="shell-sidebar__section-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="shell-sidebar__section-label">{label}</span>
        <span className="shell-sidebar__chevron">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="shell-sidebar__section-body">{children}</div>}
    </div>
  );
}

export default function Sidebar({
  view,
  activeToolId,
  onGoHome,
  onOpenTool,
  recentProjects = [],
  recentFiles = [],
  onOpenRecentProject,
  onOpenRecentFile,
  onImportProject,
}) {
  return (
    <aside className="shell-sidebar" aria-label="Application navigation">
      <button type="button" className="shell-sidebar__brand" onClick={onGoHome}>
        <span className="shell-sidebar__brand-mark" aria-hidden />
        <div className="shell-sidebar__brand-text">
          <span className="shell-sidebar__brand-name">Lab Tools</span>
          <span className="shell-sidebar__brand-sub">Bloom Lab</span>
        </div>
      </button>

      <div className="shell-sidebar__scroll">
        <SidebarSection label="Tools">
          <nav className="shell-sidebar__nav">
            <button
              type="button"
              className={`shell-sidebar__item${view === 'home' ? ' shell-sidebar__item--active' : ''}`}
              onClick={onGoHome}
            >
              <span className="shell-sidebar__icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </span>
              <span className="shell-sidebar__label">Dashboard</span>
            </button>
            {SIDEBAR_TOOLS.map((tool) => (
              <button
                key={tool.id}
                type="button"
                className={`shell-sidebar__item${
                  view === 'tool' && activeToolId === tool.id ? ' shell-sidebar__item--active' : ''
                }`}
                onClick={() => onOpenTool(tool.id)}
              >
                <span className="shell-sidebar__icon">
                  <ToolIcon name={tool.icon} />
                </span>
                <span className="shell-sidebar__label">{tool.label}</span>
              </button>
            ))}
          </nav>
        </SidebarSection>

        {(recentProjects.length > 0 || onImportProject) && (
          <SidebarSection label="Recent projects">
            {recentProjects.length === 0 ? (
              <p className="shell-sidebar__empty">No saved projects yet.</p>
            ) : (
              <ul className="shell-sidebar__recents">
                {recentProjects.slice(0, 8).map((p) => (
                  <li key={p.projectId}>
                    <button
                      type="button"
                      className="shell-sidebar__recent"
                      onClick={() => onOpenRecentProject?.(p.projectId)}
                      title={p.name}
                    >
                      <span className="shell-sidebar__recent-name">{p.name}</span>
                      <span className="shell-sidebar__recent-meta">
                        {p.tabCount} tab{p.tabCount !== 1 ? 's' : ''} · {formatWhen(p.lastModifiedAt)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {onImportProject && (
              <button type="button" className="shell-sidebar__link" onClick={onImportProject}>
                Import project…
              </button>
            )}
          </SidebarSection>
        )}

        {recentFiles.length > 0 && (
          <SidebarSection label="Recent files">
            <ul className="shell-sidebar__recents">
              {recentFiles.slice(0, 6).map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    className="shell-sidebar__recent"
                    onClick={() => onOpenRecentFile?.(f)}
                    title={f.name}
                  >
                    <span className="shell-sidebar__recent-name">{f.name}</span>
                    <span className="shell-sidebar__recent-meta">
                      {TOOLS[f.toolId]?.name ?? f.toolId} · {formatWhen(f.lastOpenedAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </SidebarSection>
        )}
      </div>
    </aside>
  );
}
