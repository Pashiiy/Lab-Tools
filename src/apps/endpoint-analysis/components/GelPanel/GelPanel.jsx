import { useState } from 'react';
import GelSlot from './GelSlot';
import GelControls from './GelControls';

const GEL_KEYS = [
  { key: 'galcen', label: 'GalCen' },
  { key: 'cen3', label: 'Cen3' },
  { key: 'rearrangement', label: 'Rearrangement' },
  { key: 'reciprocal', label: 'Reciprocal' },
];

export default function GelPanel({
  gels,
  onUpload,
  onRemove,
  onUpdateAdjustment,
  onResetAdjustments,
}) {
  const [openDrawer, setOpenDrawer] = useState(null);

  const toggleDrawer = (key) => {
    setOpenDrawer((prev) => (prev === key ? null : key));
  };

  const activeGel = openDrawer ? GEL_KEYS.find((g) => g.key === openDrawer) : null;

  return (
    <section className="gel-strip">
      <div className="gel-strip__grid">
        {GEL_KEYS.map(({ key, label }) => (
          <GelSlot
            key={key}
            label={label}
            gel={gels[key]}
            isEditing={openDrawer === key}
            onEdit={() => toggleDrawer(key)}
            onUpload={(file) => onUpload(key, file)}
            onRemove={() => {
              onRemove(key);
              if (openDrawer === key) setOpenDrawer(null);
            }}
            onUpdate={(field, value) => onUpdateAdjustment(key, field, value)}
            onReset={() => onResetAdjustments(key)}
          />
        ))}
      </div>

      {activeGel && gels[activeGel.key].src && (
        <div className="gel-strip__drawer">
          <div className="gel-strip__drawer-label">{activeGel.label} adjustments</div>
          <GelControls
            gel={gels[activeGel.key]}
            onUpdate={(field, value) => onUpdateAdjustment(activeGel.key, field, value)}
            onReset={() => onResetAdjustments(activeGel.key)}
          />
        </div>
      )}
    </section>
  );
}
