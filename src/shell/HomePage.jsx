import { useMemo, useState } from 'react';
import { TOOL_LIST } from './toolRegistry';
import { TOOL_CATEGORIES, getManifest, getActiveTools } from './toolManifest';
import { ToolIcon } from './ToolIcons';
import { APP_NAME, APP_TAGLINE } from '../shared/brand';
import './home.css';
import '../research/research.css';

function ToolCard({ tool, index, isFavorite, onOpen, onToggleFavorite }) {
  return (
    <article
      className="home-card"
      style={{ '--stagger': index }}
    >
      <button
        type="button"
        className="home-card__main"
        onClick={() => onOpen(tool.id)}
      >
        <div className="home-card__icon-wrap" aria-hidden>
          <ToolIcon name={tool.manifest.Icon} />
        </div>
        <div className="home-card__content">
          <h3 className="home-card__name">{tool.name}</h3>
          <p className="home-card__desc">{tool.description}</p>
          {tool.manifest.hint && (
            <p className="home-card__hint">{tool.manifest.hint}</p>
          )}
        </div>
        <span className="home-card__arrow" aria-hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </button>
      <div className="home-card__footer">
        <span className="home-card__category">{tool.categoryLabel}</span>
        <button
          type="button"
          className={`home-card__fav${isFavorite ? ' home-card__fav--on' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(tool.id);
          }}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {isFavorite ? '★' : '☆'}
        </button>
      </div>
    </article>
  );
}

function QuickLaunchCard({ tool, index, onOpen, variant = 'recent' }) {
  return (
    <button
      type="button"
      className={`home-quick home-quick--${variant}`}
      style={{ '--stagger': index }}
      onClick={() => onOpen(tool.id)}
    >
      <span className="home-quick__icon" aria-hidden>
        <ToolIcon name={tool.manifest.Icon} />
      </span>
      <span className="home-quick__label">{tool.name}</span>
    </button>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatWhen(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

function RecentFiles({ files, onOpen, onRemove, onClear, toolNames }) {
  if (files.length === 0) return null;
  return (
    <section className="home__continue home-animate" style={{ '--stagger': 2 }}>
      <div className="home__continue-head">
        <h2 className="home__section-label">Recent files</h2>
        <button type="button" className="home__import-btn" onClick={onClear}>
          Clear history
        </button>
      </div>
      <div className="home__project-grid">
        {files.map((f, i) => (
          <div key={f.id} className="home__project home__project--file" style={{ '--stagger': i }}>
            <button type="button" className="home__project-main" onClick={() => onOpen(f)}>
              <span className="home__project-name">{f.name}</span>
              <span className="home__project-meta">
                {toolNames[f.toolId] ?? f.toolId} · {formatWhen(f.lastOpenedAt)}
              </span>
            </button>
            <div className="home__project-actions">
              <button type="button" aria-label="Remove from recent files" onClick={() => onRemove(f.id)}>
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function NewResearchProjectModal({ open, onClose, onCreate }) {
  const [form, setForm] = useState({
    name: '',
    pi: '',
    researcher: '',
    description: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    location: '',
    notes: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (!open) return null;

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Project name is required');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onCreate({ ...form, name: form.name.trim() });
      onClose();
    } catch (err) {
      setError(err?.message || 'Could not create project');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="home-research-modal" role="dialog" aria-modal="true" aria-labelledby="new-research-title">
      <form className="home-research-modal__card" onSubmit={submit}>
        <h2 id="new-research-title">New Research Project</h2>
        <label>
          Project name *
          <input className="lt-input" value={form.name} onChange={setField('name')} required autoFocus />
        </label>
        <label>
          Principal investigator
          <input className="lt-input" value={form.pi} onChange={setField('pi')} />
        </label>
        <label>
          Researcher
          <input className="lt-input" value={form.researcher} onChange={setField('researcher')} />
        </label>
        <label>
          Description
          <textarea className="lt-input" rows={3} value={form.description} onChange={setField('description')} />
        </label>
        <label>
          Start date
          <input className="lt-input" type="date" value={form.startDate} onChange={setField('startDate')} />
        </label>
        <label>
          End date
          <input className="lt-input" type="date" value={form.endDate} onChange={setField('endDate')} />
        </label>
        <label>
          Location
          <input className="lt-input" value={form.location} onChange={setField('location')} />
        </label>
        <label>
          Notes
          <textarea className="lt-input" rows={2} value={form.notes} onChange={setField('notes')} />
        </label>
        {error && <p className="home-research__empty">{error}</p>}
        <div className="home-research-modal__actions">
          <button type="button" className="lt-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="lt-btn lt-btn--primary" disabled={busy}>
            {busy ? 'Creating…' : 'Create & Open'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ResearchProjects({ projects, isElectron, onNew, onOpen, onImport, onDelete }) {
  return (
    <section className="home-research home-animate" style={{ '--stagger': 1 }}>
      <div className="home-research__header">
        <h2 className="home__section-label">Research Projects</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {isElectron && (
            <>
              <button type="button" className="home__import-btn" onClick={onImport}>
                Import…
              </button>
              <button type="button" className="lt-btn lt-btn--primary lt-btn--small" onClick={onNew}>
                New Project
              </button>
            </>
          )}
        </div>
      </div>
      {!isElectron ? (
        <p className="home-research__web-note">
          Research Projects open in a dedicated desktop window. Use the Benchy desktop app (not the web build).
        </p>
      ) : projects.length === 0 ? (
        <p className="home-research__empty">
          No projects yet. Create a new Research Project to begin organizing your experiments.
        </p>
      ) : (
        <ul className="home-research__list">
          {projects.map((p) => (
            <li key={p.projectId}>
              <button type="button" className="home-research__item" onClick={() => onOpen(p.projectId)}>
                <span>
                  <span className="home__project-name">{p.name}</span>
                  <span className="home-research__meta">
                    {p.pi ? `${p.pi} · ` : ''}
                    {formatWhen(p.lastModifiedAt)}
                  </span>
                </span>
              </button>
              {onDelete && (
                <button
                  type="button"
                  className="lt-btn lt-btn--small"
                  aria-label={`Delete ${p.name}`}
                  onClick={() => {
                    if (window.confirm(`Delete research project "${p.name}"?`)) onDelete(p.projectId);
                  }}
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ContinueWorking({ projects, onOpen, onRename, onDelete, onImport }) {
  return (
    <section className="home__continue home-animate" style={{ '--stagger': 2 }}>
      <div className="home__continue-head">
        <h2 className="home__section-label">Quick Analysis</h2>
        <button type="button" className="home__import-btn" onClick={onImport}>
          Import project…
        </button>
      </div>
      {projects.length === 0 ? (
        <p className="home__continue-empty">
          Tab sessions for quick work — autosaved separately from Research Projects.
        </p>
      ) : (
        <div className="home__project-grid">
          {projects.map((p, i) => (
            <div key={p.projectId} className="home__project" style={{ '--stagger': i }}>
              <button
                type="button"
                className="home__project-main"
                onClick={() => onOpen(p.projectId)}
              >
                <span className="home__project-name">{p.name}</span>
                <span className="home__project-meta">
                  {p.tabCount} tab{p.tabCount !== 1 ? 's' : ''} · {formatWhen(p.lastModifiedAt)}
                </span>
              </button>
              <div className="home__project-actions">
                <button
                  type="button"
                  aria-label="Rename project"
                  onClick={() => {
                    const name = window.prompt('Rename project', p.name);
                    if (name && name.trim()) onRename(p.projectId, name.trim());
                  }}
                >
                  ✎
                </button>
                <button
                  type="button"
                  aria-label="Delete project"
                  onClick={() => {
                    if (window.confirm(`Delete project "${p.name}"? This cannot be undone.`)) {
                      onDelete(p.projectId);
                    }
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function HomePage({
  onOpenTool,
  favorites,
  recent,
  onToggleFavorite,
  isFavorite,
  recentProjects = [],
  onOpenRecentProject,
  onRenameRecentProject,
  onDeleteRecentProject,
  onImportProject,
  recentFiles = [],
  onOpenRecentFile,
  onRemoveRecentFile,
  onClearRecentFiles,
  isElectron = false,
  researchProjects = [],
  onCreateResearchProject,
  onOpenResearchProject,
  onImportResearchProject,
  onDeleteResearchProject,
}) {
  const [newResearchOpen, setNewResearchOpen] = useState(false);

  const enrichedTools = useMemo(
    () =>
      getActiveTools(TOOL_LIST).map((tool) => {
        const manifest = getManifest(tool.id);
        return {
          ...tool,
          manifest,
          categoryLabel: TOOL_CATEGORIES[manifest.category]?.label ?? 'Analysis',
        };
      }),
    []
  );

  const recentTools = useMemo(
    () =>
      recent
        .map((id) => enrichedTools.find((t) => t.id === id))
        .filter(Boolean),
    [recent, enrichedTools]
  );

  const favoriteTools = useMemo(
    () => enrichedTools.filter((t) => favorites.includes(t.id)),
    [enrichedTools, favorites]
  );

  const toolNames = useMemo(
    () => Object.fromEntries(enrichedTools.map((t) => [t.id, t.name])),
    [enrichedTools]
  );

  const grouped = useMemo(() => {
    const order = Object.values(TOOL_CATEGORIES).sort((a, b) => a.order - b.order);
    return order
      .map((cat) => ({
        category: cat,
        tools: enrichedTools.filter((t) => t.manifest.category === cat.id),
      }))
      .filter((g) => g.tools.length > 0);
  }, [enrichedTools]);

  let cardIndex = 0;

  return (
    <div className="home">
      <div className="home__ambient" aria-hidden />

      <header className="home__welcome home-animate" style={{ '--stagger': 0 }}>
        <p className="home__greeting">{getGreeting()}</p>
        <div className="home__title-row">
          <img
            className="home__logo"
            src={`${import.meta.env.BASE_URL}logo.svg`}
            alt=""
            width={40}
            height={40}
            aria-hidden
          />
          <h1 className="home__title">{APP_NAME}</h1>
        </div>
        <p className="home__subtitle">{APP_TAGLINE}</p>
      </header>

      <ResearchProjects
        projects={researchProjects}
        isElectron={isElectron}
        onNew={() => setNewResearchOpen(true)}
        onOpen={onOpenResearchProject}
        onImport={onImportResearchProject}
        onDelete={onDeleteResearchProject}
      />

      <ContinueWorking
        projects={recentProjects}
        onOpen={onOpenRecentProject}
        onRename={onRenameRecentProject}
        onDelete={onDeleteRecentProject}
        onImport={onImportProject}
      />

      <RecentFiles
        files={recentFiles}
        onOpen={onOpenRecentFile}
        onRemove={onRemoveRecentFile}
        onClear={onClearRecentFiles}
        toolNames={toolNames}
      />

      {(recentTools.length > 0 || favoriteTools.length > 0) && (
        <div className="home__quick-row">
          {recentTools.length > 0 && (
            <section className="home__quick-section home-animate" style={{ '--stagger': 1 }}>
              <h2 className="home__section-label">Recent</h2>
              <div className="home__quick-track">
                {recentTools.map((tool, i) => (
                  <QuickLaunchCard
                    key={tool.id}
                    tool={tool}
                    index={i}
                    onOpen={onOpenTool}
                    variant="recent"
                  />
                ))}
              </div>
            </section>
          )}

          {favoriteTools.length > 0 && (
            <section className="home__quick-section home-animate" style={{ '--stagger': 2 }}>
              <h2 className="home__section-label">Favorites</h2>
              <div className="home__quick-track">
                {favoriteTools.map((tool, i) => (
                  <QuickLaunchCard
                    key={tool.id}
                    tool={tool}
                    index={i}
                    onOpen={onOpenTool}
                    variant="favorite"
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {grouped.map(({ category, tools }, sectionIdx) => (
        <section
          key={category.id}
          className="home__category home-animate"
          style={{ '--stagger': 3 + sectionIdx }}
        >
          <div className="home__category-header">
            <h2 className="home__section-label">{category.label}</h2>
            <span className="home__category-count">
              {tools.length} module{tools.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="home__grid">
            {tools.map((tool) => {
              const idx = cardIndex++;
              return (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  index={idx}
                  isFavorite={isFavorite(tool.id)}
                  onOpen={onOpenTool}
                  onToggleFavorite={onToggleFavorite}
                />
              );
            })}
          </div>
        </section>
      ))}

      <NewResearchProjectModal
        open={newResearchOpen}
        onClose={() => setNewResearchOpen(false)}
        onCreate={onCreateResearchProject}
      />
    </div>
  );
}
