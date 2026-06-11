import { useCallback, useEffect, useRef, useState } from 'react';

function fmt(n, digits = 2) {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toFixed(digits);
}

function pairStatus(pair) {
  if (pair.complete) return 'Complete';
  if (pair.target && !pair.control) return 'Awaiting control';
  if (!pair.target) return 'Awaiting target';
  return 'Incomplete';
}

function GeomField({ label, value, onChange, min = 0 }) {
  return (
    <label className="gq-roi-manager__geom-field">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value))}
        onClick={(e) => e.stopPropagation()}
      />
    </label>
  );
}

function RoiSlot({
  slot,
  roleLabel,
  pairId,
  pairs,
  ROI_ROLES,
  ROI_GEOMETRY,
  activeRoiId,
  onSelectRoi,
  onUserLabelChange,
  onReassign,
  onDelete,
  onGeometryChange,
}) {
  const [geomExpanded, setGeomExpanded] = useState(false);

  if (!slot) {
    return (
      <div className="gq-roi-manager__slot gq-roi-manager__slot--empty">
        <span className="gq-roi-manager__slot-role">{roleLabel}</span>
        <span className="gq-roi-manager__slot-pending">Pending click</span>
      </div>
    );
  }

  const m = slot.measurements;
  const isActive = slot.id === activeRoiId;

  return (
    <div
      className={[
        'gq-roi-manager__slot',
        isActive ? 'gq-roi-manager__slot--active' : '',
        slot.role === ROI_ROLES.TARGET ? 'gq-roi-manager__slot--target' : 'gq-roi-manager__slot--control',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => onSelectRoi(slot.id)}
    >
      <div className="gq-roi-manager__slot-head">
        <span className="gq-roi-manager__slot-role">{roleLabel}</span>
        <div className="gq-roi-manager__card-actions">
          <button
            type="button"
            className="gq-roi-manager__icon-btn"
            aria-expanded={geomExpanded}
            aria-label={geomExpanded ? 'Collapse geometry' : 'Expand geometry'}
            onClick={(e) => {
              e.stopPropagation();
              setGeomExpanded((v) => !v);
            }}
          >
            {geomExpanded ? '▾' : '▸'}
          </button>
          <button
            type="button"
            className="gq-roi-manager__icon-btn gq-roi-manager__icon-btn--danger"
            aria-label={`Delete ${roleLabel}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(slot.id);
            }}
          >
            ×
          </button>
        </div>
      </div>

      <input
        type="text"
        className="gq-roi-manager__label-input"
        placeholder={slot.name}
        value={slot.userLabel}
        onChange={(e) => onUserLabelChange(slot.id, e.target.value)}
        onClick={(e) => e.stopPropagation()}
      />

      <div className="gq-roi-manager__metrics gq-roi-manager__metrics--compact">
        <span>IntDen {fmt(m?.intDenInner, 1)}</span>
        <span>Corr. {fmt(m?.correctedIntensity, 2)}</span>
      </div>

      <label className="gq-roi-manager__reassign" onClick={(e) => e.stopPropagation()}>
        <span>Move to</span>
        <select
          className="gq-roi-manager__select"
          value={`${pairId}:${slot.role}`}
          onChange={(e) => {
            const [pid, role] = e.target.value.split(':');
            onReassign(slot.id, pid, role);
          }}
        >
          {pairs.map((p) => (
            <optgroup key={p.id} label={p.name}>
              <option value={`${p.id}:${ROI_ROLES.TARGET}`}>{p.name} · Target</option>
              <option value={`${p.id}:${ROI_ROLES.CONTROL}`}>{p.name} · Control</option>
            </optgroup>
          ))}
        </select>
      </label>

      {geomExpanded && (
        <div className="gq-roi-manager__geom" onClick={(e) => e.stopPropagation()}>
          <p className="gq-roi-manager__geom-title">Inner</p>
          <div className="gq-roi-manager__geom-grid">
            {['x', 'y', 'width', 'height'].map((key) => (
              <GeomField
                key={`in-${key}`}
                label={key}
                min={key === 'width' || key === 'height' ? 1 : 0}
                value={slot.innerROI?.[key]}
                onChange={(v) =>
                  onGeometryChange(slot.id, ROI_GEOMETRY.INNER, {
                    ...(slot.innerROI ?? { x: 0, y: 0, width: 1, height: 1 }),
                    [key]: v,
                  })
                }
              />
            ))}
          </div>
          <p className="gq-roi-manager__geom-title">Outer</p>
          <div className="gq-roi-manager__geom-grid">
            {['x', 'y', 'width', 'height'].map((key) => (
              <GeomField
                key={`out-${key}`}
                label={key}
                min={key === 'width' || key === 'height' ? 1 : 0}
                value={slot.outerROI?.[key]}
                onChange={(v) =>
                  onGeometryChange(slot.id, ROI_GEOMETRY.OUTER, {
                    ...(slot.outerROI ?? { x: 0, y: 0, width: 1, height: 1 }),
                    [key]: v,
                  })
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PairSummary({ pair }) {
  const targetLabel = pair.target?.displayName ?? pair.target?.name;
  const controlLabel = pair.control?.displayName ?? pair.control?.name;

  return (
    <div className="gq-roi-manager__summary">
      <span className="gq-roi-manager__summary-id">#{pair.index}</span>
      <span
        className={[
          'gq-roi-manager__summary-status',
          pair.complete ? 'gq-roi-manager__summary-status--complete' : 'gq-roi-manager__summary-status--pending',
        ].join(' ')}
      >
        {pairStatus(pair)}
      </span>
      {pair.complete ? (
        <span className="gq-roi-manager__summary-metrics">
          T {fmt(pair.target?.measurements?.intDenInner, 0)} · C{' '}
          {fmt(pair.control?.measurements?.intDenInner, 0)} · R {fmt(pair.ratio, 3)}
        </span>
      ) : (
        <span className="gq-roi-manager__summary-metrics">
          {targetLabel ? `T: ${targetLabel}` : 'No target'}
          {controlLabel ? ` · C: ${controlLabel}` : pair.target ? ' · No control' : ''}
        </span>
      )}
    </div>
  );
}

export default function RoiManager({
  pairs,
  activeRoiId,
  ROI_ROLES,
  ROI_GEOMETRY,
  onSelectRoi,
  onRenamePair,
  onDeletePair,
  onReorderPairs,
  onUserLabelChange,
  onReassign,
  onDelete,
  onGeometryChange,
}) {
  const [expandedPairId, setExpandedPairId] = useState(null);
  const [draggingPairId, setDraggingPairId] = useState(null);
  const [dropTargetPairId, setDropTargetPairId] = useState(null);

  const draggingPairIdRef = useRef(null);
  const dropTargetPairIdRef = useRef(null);
  const dragCommittedRef = useRef(false);
  const listRef = useRef(null);

  const completeCount = pairs.filter((p) => p.complete).length;

  const togglePair = useCallback((pairId) => {
    setExpandedPairId((current) => (current === pairId ? null : pairId));
  }, []);

  const resolveDropTarget = useCallback((clientX, clientY) => {
    const draggedId = draggingPairIdRef.current;
    if (!draggedId) return null;

    const elements = document.elementsFromPoint(clientX, clientY);
    for (const el of elements) {
      const card = el.closest?.('[data-pair-id]');
      if (!card) continue;
      const id = card.getAttribute('data-pair-id');
      if (id && id !== draggedId) return id;
    }
    return null;
  }, []);

  const finishDrag = useCallback(
    (commit) => {
      if (dragCommittedRef.current) return;
      dragCommittedRef.current = true;

      const fromId = draggingPairIdRef.current;
      const toId = dropTargetPairIdRef.current;
      if (commit && fromId && toId && fromId !== toId) {
        onReorderPairs(fromId, toId);
      }

      draggingPairIdRef.current = null;
      dropTargetPairIdRef.current = null;
      setDraggingPairId(null);
      setDropTargetPairId(null);

      requestAnimationFrame(() => {
        dragCommittedRef.current = false;
      });
    },
    [onReorderPairs]
  );

  const handleDragHandlePointerDown = useCallback((e, pairId) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    dragCommittedRef.current = false;
    draggingPairIdRef.current = pairId;
    dropTargetPairIdRef.current = null;
    setDraggingPairId(pairId);
    setDropTargetPairId(null);
  }, []);

  useEffect(() => {
    if (!draggingPairId) return undefined;

    const onPointerMove = (e) => {
      const targetId = resolveDropTarget(e.clientX, e.clientY);
      if (targetId) {
        dropTargetPairIdRef.current = targetId;
        setDropTargetPairId(targetId);
      }
    };

    const onPointerUp = () => finishDrag(true);
    const onKeyDown = (e) => {
      if (e.key === 'Escape') finishDrag(false);
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [draggingPairId, finishDrag, resolveDropTarget]);

  return (
    <aside className="gq-sidebar gq-sidebar--right gq-roi-manager">
      <div className="gq-roi-manager__header">
        <h3 className="gq-roi-manager__title">Pair Manager</h3>
      </div>
      <p className="gq-roi-manager__subtitle">
        {pairs.length} pair{pairs.length !== 1 ? 's' : ''} · {completeCount} with ratio
      </p>

      {pairs.length === 0 ? (
        <p className="gq-roi-manager__empty">
          Click Target on a band, then Control on its reference band. Pairs form automatically.
        </p>
      ) : (
        <div
          ref={listRef}
          className={`gq-roi-manager__list${draggingPairId ? ' gq-roi-manager__list--dragging' : ''}`}
          role="list"
        >
          {pairs.map((pair) => {
            const isExpanded = expandedPairId === pair.id;
            const isDragging = draggingPairId === pair.id;
            const isDropTarget =
              dropTargetPairId === pair.id &&
              draggingPairId !== null &&
              draggingPairId !== pair.id;

            return (
              <section
                key={pair.id}
                data-pair-id={pair.id}
                role="listitem"
                className={[
                  'gq-roi-manager__group',
                  pair.complete ? 'gq-roi-manager__group--complete' : 'gq-roi-manager__group--pending',
                  isExpanded ? 'gq-roi-manager__group--expanded' : 'gq-roi-manager__group--collapsed',
                  isDragging ? 'gq-roi-manager__group--dragging' : '',
                  isDropTarget ? 'gq-roi-manager__group--drop-target' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="gq-roi-manager__group-head">
                  <div
                    className="gq-roi-manager__drag-handle"
                    role="button"
                    tabIndex={0}
                    aria-label={`Reorder ${pair.name}`}
                    title="Drag to reorder"
                    onPointerDown={(e) => handleDragHandlePointerDown(e, pair.id)}
                  >
                    ⠿
                  </div>

                  <button
                    type="button"
                    className="gq-roi-manager__accordion-trigger"
                    aria-expanded={isExpanded}
                    onClick={() => togglePair(pair.id)}
                  >
                    <span className="gq-roi-manager__title-row">
                      <span className="gq-roi-manager__chevron" aria-hidden>
                        {isExpanded ? '▾' : '▸'}
                      </span>
                      <span className="gq-roi-manager__group-name-text">{pair.name}</span>
                    </span>
                    {!isExpanded && <PairSummary pair={pair} />}
                  </button>

                  {isExpanded && pair.complete && (
                    <span className="gq-roi-manager__ratio-badge">R {fmt(pair.ratio, 4)}</span>
                  )}

                  <button
                    type="button"
                    className="gq-roi-manager__icon-btn gq-roi-manager__icon-btn--danger"
                    title="Delete pair"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (expandedPairId === pair.id) setExpandedPairId(null);
                      onDeletePair(pair.id);
                    }}
                  >
                    ×
                  </button>
                </div>

                {isExpanded && (
                  <div className="gq-roi-manager__pair-body">
                    <label className="gq-roi-manager__rename-row" onClick={(e) => e.stopPropagation()}>
                      <span>Pair name</span>
                      <input
                        type="text"
                        className="gq-roi-manager__group-name"
                        value={pair.name}
                        onChange={(e) => onRenamePair(pair.id, e.target.value)}
                      />
                    </label>

                    <RoiSlot
                      slot={pair.target}
                      roleLabel="Target"
                      pairId={pair.id}
                      pairs={pairs}
                      ROI_ROLES={ROI_ROLES}
                      ROI_GEOMETRY={ROI_GEOMETRY}
                      activeRoiId={activeRoiId}
                      onSelectRoi={onSelectRoi}
                      onUserLabelChange={onUserLabelChange}
                      onReassign={onReassign}
                      onDelete={onDelete}
                      onGeometryChange={onGeometryChange}
                    />
                    <RoiSlot
                      slot={pair.control}
                      roleLabel="Control"
                      pairId={pair.id}
                      pairs={pairs}
                      ROI_ROLES={ROI_ROLES}
                      ROI_GEOMETRY={ROI_GEOMETRY}
                      activeRoiId={activeRoiId}
                      onSelectRoi={onSelectRoi}
                      onUserLabelChange={onUserLabelChange}
                      onReassign={onReassign}
                      onDelete={onDelete}
                      onGeometryChange={onGeometryChange}
                    />
                    {pair.complete && (
                      <div className="gq-roi-manager__pair-ratio">
                        <span>Ratio (Target / Control)</span>
                        <strong>{fmt(pair.ratio, 4)}</strong>
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </aside>
  );
}
