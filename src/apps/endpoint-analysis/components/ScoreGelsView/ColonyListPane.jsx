import { useState, useRef, useEffect, useMemo } from 'react';
import ToggleButton from '../DataTable/ToggleButton';

const GEL_TARGETS = [
  { key: 'galcen', label: 'GalCen' },
  { key: 'cen3', label: 'Cen3' },
  { key: 'rearrangement', label: 'Rearrangement' },
  { key: 'reciprocal', label: 'Reciprocal' },
];

function toSuperscript(n) {
  const superscripts = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  return String(n)
    .split('')
    .map((d) => superscripts[Number(d)])
    .join('');
}

export default function ColonyListPane({
  gels,
  colonies,
  colonyCount,
  activeGel,
  onGelChange,
  onToggle,
}) {
  const [confirmAction, setConfirmAction] = useState(null);
  const confirmTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    };
  }, []);

  const positiveCounts = useMemo(() => {
    const counts = {};
    GEL_TARGETS.forEach(({ key }) => {
      counts[key] = colonies.filter((c) => c[key] === 1).length;
    });
    return counts;
  }, [colonies]);

  const activePositive = positiveCounts[activeGel] || 0;

  const handleBulkAction = (action) => {
    if (confirmAction !== action) {
      setConfirmAction(action);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirmAction(null), 2000);
      return;
    }

    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    setConfirmAction(null);

    colonies.forEach((colony) => {
      const target = action === 'clear' ? 0 : 1;
      if (colony[activeGel] !== target) {
        onToggle(colony.id, activeGel, target);
      }
    });
  };

  return (
    <div className="colony-list-pane">
      <div className="colony-list-pane__gel-tabs">
        {GEL_TARGETS.map(({ key, label }) => {
          const count = positiveCounts[key];
          const hasImage = Boolean(gels[key]?.src);
          return (
            <button
              key={key}
              type="button"
              className={`colony-list-pane__gel-tab${activeGel === key ? ' colony-list-pane__gel-tab--active' : ''}`}
              onClick={() => onGelChange(key)}
            >
              <span
                className={`colony-list-pane__dot${hasImage ? ' colony-list-pane__dot--uploaded' : ''}`}
              />
              <span className="colony-list-pane__gel-label">
                {label}
                {count > 0 && (
                  <span className="colony-list-pane__count-badge">
                    {toSuperscript(count)}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="colony-list-pane__list">
        {colonies.map((colony, index) => (
          <div
            key={colony.id}
            className={`colony-list-row checkbox-row${index % 2 === 1 ? ' colony-list-row--alt' : ''}`}
          >
            <span className="colony-number">{colony.id}</span>
            <ToggleButton
              size="compact"
              wrapRow={false}
              value={colony[activeGel]}
              onChange={(v) => onToggle(colony.id, activeGel, v)}
            />
          </div>
        ))}
      </div>

      <div className="colony-list-pane__footer">
        <div className="colony-list-pane__footer-count">
          ✓ {activePositive} / {colonyCount} positive
        </div>
        <div className="colony-list-pane__footer-actions">
          <button
            type="button"
            className={`colony-list-pane__action${confirmAction === 'clear' ? ' colony-list-pane__action--confirm' : ''}`}
            onClick={() => handleBulkAction('clear')}
          >
            {confirmAction === 'clear' ? 'Tap again to confirm' : 'Clear All'}
          </button>
          <button
            type="button"
            className={`colony-list-pane__action${confirmAction === 'all' ? ' colony-list-pane__action--confirm' : ''}`}
            onClick={() => handleBulkAction('all')}
          >
            {confirmAction === 'all' ? 'Tap again to confirm' : 'All Pos'}
          </button>
        </div>
      </div>
    </div>
  );
}
