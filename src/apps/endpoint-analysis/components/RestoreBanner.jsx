import { formatTimeAgo } from '../utils/session';

export default function RestoreBanner({ savedAt, onRestore, onDiscard }) {
  return (
    <div className="restore-banner">
      <div className="restore-banner__content">
        <span className="restore-banner__icon">↻</span>
        <p className="restore-banner__text">
          You have an unsaved session from {formatTimeAgo(savedAt)}. Restore it?
        </p>
        <div className="restore-banner__actions">
          <button type="button" className="restore-banner__btn" onClick={onRestore}>
            Restore
          </button>
          <button
            type="button"
            className="restore-banner__btn restore-banner__btn--ghost"
            onClick={onDiscard}
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}
