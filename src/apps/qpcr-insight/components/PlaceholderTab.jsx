export default function PlaceholderTab({ title }) {
  return (
    <div className="qi-placeholder-tab">
      <span className="qi-placeholder-tab__icon" aria-hidden>
        ◌
      </span>
      <h2 className="qi-placeholder-tab__title">{title}</h2>
      <p className="qi-placeholder-tab__text">This section will be built in the next step.</p>
    </div>
  );
}
