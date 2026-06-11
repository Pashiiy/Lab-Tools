import { useCallback, useRef, useState } from 'react';
import { TOOL_LIST } from './toolRegistry';

const TOOL_VISUALS = {
  'endpoint-analysis': {
    accent: 'var(--lt-accent)',
    gradient:
      'linear-gradient(160deg, rgba(46, 139, 87, 0.22) 0%, rgba(19, 41, 75, 0.55) 55%, rgba(15, 15, 18, 0.92) 100%)',
    parallax: 1.2,
    hint: 'Gel scoring · colony classification · Excel charts',
    Icon: EndpointIcon,
  },
  'colony-counter': {
    accent: 'var(--lt-accent)',
    gradient:
      'linear-gradient(160deg, rgba(46, 139, 87, 0.18) 0%, rgba(75, 156, 211, 0.2) 40%, rgba(19, 41, 75, 0.5) 70%, rgba(15, 15, 18, 0.92) 100%)',
    parallax: 0.9,
    hint: 'Petri dish marking · CFU calculator · session files',
    Icon: ColonyIcon,
  },
  'gel-quantification': {
    accent: 'var(--lt-accent)',
    gradient:
      'linear-gradient(160deg, rgba(46, 139, 87, 0.24) 0%, rgba(125, 206, 160, 0.12) 35%, rgba(19, 41, 75, 0.52) 65%, rgba(15, 15, 18, 0.92) 100%)',
    parallax: 1.05,
    hint: 'Box-in-box correction · pair ratios · multi-sheet export',
    Icon: GelIcon,
  },
};

function EndpointIcon() {
  return (
    <svg className="shell-home__icon-svg" viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect x="8" y="28" width="8" height="12" rx="1" fill="currentColor" opacity="0.9" />
      <rect x="20" y="20" width="8" height="20" rx="1" fill="currentColor" opacity="0.7" />
      <rect x="32" y="12" width="8" height="28" rx="1" fill="currentColor" />
      <path d="M6 40h36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}

function ColonyIcon() {
  return (
    <svg className="shell-home__icon-svg" viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="17" stroke="currentColor" strokeWidth="2" opacity="0.45" />
      <circle cx="17" cy="20" r="2.5" fill="currentColor" />
      <circle cx="27" cy="18" r="2" fill="currentColor" opacity="0.8" />
      <circle cx="22" cy="28" r="2.2" fill="currentColor" opacity="0.9" />
      <circle cx="31" cy="27" r="1.8" fill="currentColor" opacity="0.65" />
      <circle cx="15" cy="29" r="1.6" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

function GelIcon() {
  return (
    <svg className="shell-home__icon-svg" viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect x="10" y="14" width="28" height="22" rx="2" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <rect x="16" y="20" width="16" height="10" rx="1" stroke="currentColor" strokeWidth="2" />
      <line x1="10" y1="38" x2="38" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}

export default function HomePage({ onOpenTool }) {
  const [hoveredId, setHoveredId] = useState(null);
  const containerRef = useRef(null);
  const rafRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    const root = containerRef.current;
    if (!root) return;

    const rect = root.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;

    if (rafRef.current != null) return;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      root.style.setProperty('--mx', nx.toFixed(4));
      root.style.setProperty('--my', ny.toFixed(4));
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    const root = containerRef.current;
    if (!root) return;
    root.style.setProperty('--mx', '0');
    root.style.setProperty('--my', '0');
    setHoveredId(null);
  }, []);

  return (
    <div
      ref={containerRef}
      className="shell-home"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="shell-home__parallax-bg" aria-hidden />

      <header className="shell-home__header">
        <h1 className="shell-home__title">Lab Tools</h1>
        <p className="shell-home__tagline">Select a module to open a new session</p>
      </header>

      <div className="shell-home__panels" role="list">
        {TOOL_LIST.map((tool) => {
          const visual = TOOL_VISUALS[tool.id] ?? TOOL_VISUALS['endpoint-analysis'];
          const { Icon } = visual;
          const isHovered = hoveredId === tool.id;
          const isShrunk = hoveredId != null && hoveredId !== tool.id;

          return (
            <button
              key={tool.id}
              type="button"
              role="listitem"
              className={[
                'shell-home__panel',
                `shell-home__panel--${tool.id}`,
                isHovered ? 'shell-home__panel--hovered' : '',
                isShrunk ? 'shell-home__panel--shrunk' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{
                '--panel-accent': visual.accent,
                '--panel-gradient': visual.gradient,
                '--panel-parallax': visual.parallax,
              }}
              onMouseEnter={() => setHoveredId(tool.id)}
              onFocus={() => setHoveredId(tool.id)}
              onClick={() => onOpenTool(tool.id)}
              aria-label={`Open ${tool.name}`}
            >
              <div className="shell-home__panel-bg" aria-hidden />
              <div className="shell-home__panel-glow" aria-hidden />

              <div className="shell-home__panel-content">
                <div className="shell-home__panel-icon">
                  <Icon />
                </div>

                <h2 className="shell-home__panel-name">{tool.name}</h2>

                <div className="shell-home__panel-details">
                  <p className="shell-home__panel-desc">{tool.description}</p>
                  <p className="shell-home__panel-hint">{visual.hint}</p>
                  <span className="shell-home__panel-cta">Open new session</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
