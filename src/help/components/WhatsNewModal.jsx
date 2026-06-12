export default function WhatsNewModal({ open, content, onClose, onDismiss }) {
  if (!open || !content) return null;

  const entry =
    content.whatsNew?.find((w) => w.version === content.version) ??
    content.whatsNew?.[0];

  if (!entry) return null;

  return (
    <div className="onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="whats-new-title">
      <div className="onboarding-modal__backdrop" onClick={onDismiss} aria-hidden="true" />
      <div className="onboarding-modal__card onboarding-modal__card--compact">
        <header className="onboarding-modal__header onboarding-modal__header--compact">
          <p className="onboarding-modal__eyebrow">What&apos;s new</p>
          <h2 id="whats-new-title" className="onboarding-modal__title">
            {content.title} v{content.version}
          </h2>
          {entry.date && <p className="onboarding-modal__meta">{entry.date}</p>}
        </header>
        <ul className="onboarding-modal__capabilities">
          {entry.items?.map((item) => (
            <li key={item}>
              <span className="onboarding-modal__check" aria-hidden="true">•</span>
              {item}
            </li>
          ))}
        </ul>
        <footer className="onboarding-modal__footer">
          <div className="onboarding-modal__footer-spacer" />
          <button type="button" className="onboarding-btn onboarding-btn--primary" onClick={onDismiss}>
            Continue
          </button>
        </footer>
      </div>
    </div>
  );
}
