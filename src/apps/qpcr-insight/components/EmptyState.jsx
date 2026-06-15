export default function EmptyState({ icon = '○', message }) {
  return (
    <div className="qi-empty-state">
      <span className="qi-empty-state__icon" aria-hidden>
        {icon}
      </span>
      <p className="qi-empty-state__message">{message}</p>
    </div>
  );
}
