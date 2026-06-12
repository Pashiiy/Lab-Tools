import { useEffect, useState } from 'react';
import GlobalDrawer from '../../shared/GlobalDrawer';
import DemoAnimation from './DemoAnimation';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'workflow', label: 'Workflow' },
  { id: 'tips', label: 'Tips' },
  { id: 'faq', label: 'FAQ' },
  { id: 'video', label: 'Video Guide' },
  { id: 'shortcuts', label: 'Shortcuts' },
];

export default function HelpPanel({
  open,
  onClose,
  content,
  initialTab = 'overview',
  onReplayIntro,
  onStartTour,
}) {
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  if (!content) return null;

  const shortcuts = content.keyboardShortcuts ?? [];
  const hasVideo = Boolean(content.video?.src);

  return (
    <GlobalDrawer
      open={open}
      onClose={onClose}
      title={`${content.title} — Help`}
      subtitle="Documentation and guidance"
      width={520}
    >
      <div className="help-panel">
        <div className="help-panel__actions">
          <button type="button" className="onboarding-btn onboarding-btn--secondary" onClick={onReplayIntro}>
            Replay Tutorial
          </button>
          <button type="button" className="onboarding-btn onboarding-btn--primary" onClick={onStartTour}>
            Take Guided Tour
          </button>
        </div>

        <nav className="help-panel__tabs" role="tablist">
          {TABS.map((t) => {
            if (t.id === 'shortcuts' && shortcuts.length === 0) return null;
            if (t.id === 'video' && !hasVideo && !content.demo) return null;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={`help-panel__tab${tab === t.id ? ' help-panel__tab--active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            );
          })}
        </nav>

        <div className="help-panel__content" role="tabpanel">
          {tab === 'overview' && (
            <div className="help-panel__section">
              <h3>Purpose</h3>
              <p>{content.overview?.purpose || content.purpose}</p>
              {content.overview?.useCase && (
                <>
                  <h3>Scientific use case</h3>
                  <p>{content.overview.useCase}</p>
                </>
              )}
              {content.overview?.inputs && (
                <>
                  <h3>Expected inputs</h3>
                  <p>{content.overview.inputs}</p>
                </>
              )}
              {content.overview?.outputs && (
                <>
                  <h3>Expected outputs</h3>
                  <p>{content.overview.outputs}</p>
                </>
              )}
              <ul className="help-panel__capabilities">
                {content.capabilities?.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {tab === 'workflow' && (
            <ol className="help-panel__workflow">
              {content.workflow?.map((w) => (
                <li key={w.step}>
                  <strong>
                    {w.step}. {w.title}
                  </strong>
                  <p>{w.description}</p>
                </li>
              ))}
            </ol>
          )}

          {tab === 'tips' && (
            <ul className="help-panel__tips">
              {content.tips?.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          )}

          {tab === 'faq' && (
            <dl className="help-panel__faq">
              {content.faq?.map((item) => (
                <div key={item.q} className="help-panel__faq-item">
                  <dt>{item.q}</dt>
                  <dd>{item.a}</dd>
                </div>
              ))}
            </dl>
          )}

          {tab === 'video' && (
            <div className="help-panel__video">
              <h3>{content.video?.title || 'Video guide'}</h3>
              {hasVideo ? (
                <video
                  className="help-panel__video-player"
                  src={content.video.src}
                  poster={content.video.poster || undefined}
                  controls
                  playsInline
                />
              ) : (
                <DemoAnimation demo={content.demo} />
              )}
              {!hasVideo && (
                <p className="help-panel__video-note">
                  Add <code>{content.video?.src}</code> to enable the full video guide.
                </p>
              )}
            </div>
          )}

          {tab === 'shortcuts' && shortcuts.length > 0 && (
            <table className="help-panel__shortcuts">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Shortcut</th>
                </tr>
              </thead>
              <tbody>
                {shortcuts.map((s) => (
                  <tr key={s.action}>
                    <td>{s.action}</td>
                    <td>
                      <kbd>{s.keys}</kbd>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'shortcuts' && shortcuts.length === 0 && (
            <p className="help-panel__empty">Keyboard shortcuts will be listed here in a future update.</p>
          )}
        </div>
      </div>
    </GlobalDrawer>
  );
}
