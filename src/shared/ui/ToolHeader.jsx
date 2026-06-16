/**
 * Standard tool header — fixed 40px bar below shell topbar or as tool root header.
 * Title left, actions right. All tools should use this instead of custom headers.
 */
export default function ToolHeader({ title, subtitle, badge, actions, children }) {
  return (
    <header className="lt-tool-header">
      <div className="lt-tool-header__left">
        {title && <h1 className="lt-tool-header__title">{title}</h1>}
        {subtitle && <span className="lt-tool-header__subtitle">{subtitle}</span>}
        {badge && <span className="lt-tool-header__badge">{badge}</span>}
        {children}
      </div>
      {actions && <div className="lt-tool-header__actions">{actions}</div>}
    </header>
  );
}
