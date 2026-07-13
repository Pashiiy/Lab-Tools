/**
 * Plate strip for batch colony analysis — mirrors GelSelector UX.
 */
export default function PlateSelector({
  plates,
  activePlateId,
  onSelect,
  onRename,
  onRemove,
  onPrev,
  onNext,
  onAdd,
  canPrev,
  canNext,
  canRemove,
}) {
  if (!plates || plates.length === 0) return null;

  const activePlate = plates.find((p) => p.id === activePlateId);
  const activeIndex = plates.findIndex((p) => p.id === activePlateId);

  return (
    <div className="cc-plate-selector" data-tour="cc-plates">
      <div className="cc-plate-selector__nav">
        <button
          type="button"
          className="lt-btn cc-plate-selector__arrow"
          onClick={onPrev}
          disabled={!canPrev}
          aria-label="Previous plate"
          title="Previous plate"
        >
          ‹
        </button>
        <span className="cc-plate-selector__position">
          {activeIndex + 1} / {plates.length}
        </span>
        <button
          type="button"
          className="lt-btn cc-plate-selector__arrow"
          onClick={onNext}
          disabled={!canNext}
          aria-label="Next plate"
          title="Next plate"
        >
          ›
        </button>
        {onAdd && (
          <button
            type="button"
            className="lt-btn lt-btn--small"
            onClick={onAdd}
            title="Add plate images"
          >
            + Add
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            className="lt-btn lt-btn--small lt-btn--danger"
            onClick={() => onRemove(activePlateId)}
            disabled={!canRemove}
            title="Remove this plate"
          >
            Remove
          </button>
        )}
      </div>

      {activePlate && (
        <input
          type="text"
          className="cc-plate-selector__name lt-input"
          value={activePlate.name || ''}
          onChange={(e) => onRename(activePlate.id, e.target.value)}
          aria-label="Plate name"
        />
      )}

      <div className="cc-plate-selector__strip" role="list">
        {plates.map((plate) => {
          const active = plate.id === activePlateId;
          const count = plate.dots?.length ?? 0;
          return (
            <button
              key={plate.id}
              type="button"
              role="listitem"
              className={`cc-plate-selector__item${active ? ' cc-plate-selector__item--active' : ''}`}
              onClick={() => onSelect(plate.id)}
              title={`${plate.name || 'Plate'} · ${count} colonies`}
            >
              {plate.imageData ? (
                <img
                  src={plate.imageData}
                  alt=""
                  className="cc-plate-selector__thumb"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span className="cc-plate-selector__thumb-placeholder" />
              )}
              <span className="cc-plate-selector__item-label">{plate.name || 'Plate'}</span>
              <span className="cc-plate-selector__item-count">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
