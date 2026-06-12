export default function CollapsibleSection({
  title,
  collapsed,
  onToggle,
  children,
  className = '',
}) {
  return (
    <section className={`ws-section${collapsed ? ' ws-section--collapsed' : ''} ${className}`.trim()}>
      <button type="button" className="ws-section__header" onClick={onToggle}>
        <span className="ws-section__chevron">{collapsed ? '▸' : '▾'}</span>
        <span className="ws-section__title">{title}</span>
      </button>
      {!collapsed && <div className="ws-section__body">{children}</div>}
    </section>
  );
}
