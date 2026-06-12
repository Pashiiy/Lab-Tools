import { getCachedThumbnail } from '../utils/gelImageCache';

function GelThumb({ gelId, thumbnailUrl, active }) {
  const src = thumbnailUrl ?? (gelId ? getCachedThumbnail(gelId) : null);

  if (!src) {
    return <span className="gq-gel-selector__thumb-placeholder" />;
  }

  return (
    <img
      src={src}
      alt=""
      className={`gq-gel-selector__thumb${active ? ' gq-gel-selector__thumb--active' : ''}`}
      loading="lazy"
      decoding="async"
    />
  );
}

export default function GelSelector({
  gels,
  activeGelId,
  onSelect,
  onRename,
  onPrev,
  onNext,
  canPrev,
  canNext,
}) {
  if (gels.length === 0) return null;

  const activeGel = gels.find((g) => g.id === activeGelId);

  return (
    <div className="gq-gel-selector">
      <div className="gq-gel-selector__nav">
        <button
          type="button"
          className="gq-btn gq-gel-selector__arrow"
          onClick={onPrev}
          disabled={!canPrev}
          aria-label="Previous gel"
          title="Previous gel"
        >
          ‹
        </button>
        <span className="gq-gel-selector__position">
          {gels.findIndex((g) => g.id === activeGelId) + 1} / {gels.length}
        </span>
        <button
          type="button"
          className="gq-btn gq-gel-selector__arrow"
          onClick={onNext}
          disabled={!canNext}
          aria-label="Next gel"
          title="Next gel"
        >
          ›
        </button>
      </div>

      {activeGel && (
        <input
          type="text"
          className="gq-gel-selector__name lt-input"
          value={activeGel.name}
          onChange={(e) => onRename(activeGel.id, e.target.value)}
          aria-label="Gel name"
        />
      )}

      <div className="gq-gel-selector__strip" role="list">
        {gels.map((gel) => {
          const active = gel.id === activeGelId;
          return (
            <button
              key={gel.id}
              type="button"
              role="listitem"
              className={`gq-gel-selector__item${active ? ' gq-gel-selector__item--active' : ''}`}
              onClick={() => onSelect(gel.id)}
              title={gel.name}
            >
              <GelThumb gelId={gel.id} thumbnailUrl={gel.thumbnailUrl} active={active} />
              <span className="gq-gel-selector__item-label">{gel.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
