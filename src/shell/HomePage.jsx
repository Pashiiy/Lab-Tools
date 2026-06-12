import { useMemo } from 'react';
import { TOOL_LIST } from './toolRegistry';
import { TOOL_CATEGORIES, getManifest } from './toolManifest';
import { ToolIcon } from './ToolIcons';
import './home.css';

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

export default function HomePage({
  onOpenTool,
  favorites,
  recent,
  onToggleFavorite,
  isFavorite,
}) {
  const enrichedTools = useMemo(
    () =>
      TOOL_LIST.map((tool) => {
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
        <h1 className="home__title">Lab Tools</h1>
        <p className="home__subtitle">
          Molecular biology analysis workspace — open a module to begin a session.
        </p>
      </header>

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
    </div>
  );
}
