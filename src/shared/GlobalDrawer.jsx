import { useEffect, useState } from 'react';
import './global-drawer.css';

export default function GlobalDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = 380,
  side = 'right',
}) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    setVisible(false);
    const timer = setTimeout(() => setMounted(false), 240);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onClose]);

  if (!mounted) return null;

  return (
    <div
      className={`global-drawer${visible ? ' global-drawer--open' : ''}`}
      role="presentation"
    >
      <button
        type="button"
        className="global-drawer__backdrop"
        onClick={onClose}
        aria-label="Close panel"
      />
      <aside
        className={`global-drawer__panel global-drawer__panel--${side}`}
        style={{ '--drawer-width': `${width}px` }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="global-drawer__header">
          <div>
            <h2 className="global-drawer__title">{title}</h2>
            {subtitle && <p className="global-drawer__subtitle">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="global-drawer__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>
        <div className="global-drawer__body">{children}</div>
      </aside>
    </div>
  );
}
