import { clamp } from './gelUtils';

const SLIDERS = [
  { key: 'brightness', label: 'Brightness', min: 50, max: 200, unit: '%' },
  { key: 'contrast', label: 'Contrast', min: 50, max: 200, unit: '%' },
  { key: 'shadows', label: 'Shadows', min: 0, max: 100, unit: '%' },
  { key: 'rotation', label: 'Rotation', min: -180, max: 180, unit: '°' },
  { key: 'zoom', label: 'Zoom', min: 50, max: 300, unit: '%' },
];

export default function GelControls({ gel, onUpdate, onReset, compact = false }) {
  const handleRotation = (delta) => {
    onUpdate('rotation', clamp(gel.rotation + delta, -180, 180));
  };

  const handleZoomChange = (value) => {
    onUpdate('zoom', value);
    if (value === 100) {
      onUpdate('panX', 0);
      onUpdate('panY', 0);
    }
  };

  return (
    <div className={`gel-controls${compact ? ' gel-controls--compact' : ''}`}>
      {SLIDERS.map(({ key, label, min, max, unit }) => (
        <div key={key} className="gel-controls__row">
          <label className="gel-controls__label" htmlFor={`${key}-slider`}>
            {label}
          </label>
          <input
            id={`${key}-slider`}
            type="range"
            className="gel-controls__slider"
            min={min}
            max={max}
            step={1}
            value={gel[key]}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (key === 'zoom') handleZoomChange(value);
              else onUpdate(key, value);
            }}
          />
          <span className="gel-controls__value">
            {gel[key]}
            {unit}
          </span>
          {key === 'rotation' && (
            <div className="gel-controls__rotation-btns">
              <button type="button" onClick={() => handleRotation(-90)}>
                ↺ -90°
              </button>
              <button type="button" onClick={() => handleRotation(90)}>
                ↻ +90°
              </button>
            </div>
          )}
        </div>
      ))}
      <button type="button" className="gel-controls__reset" onClick={onReset}>
        Reset all
      </button>
    </div>
  );
}
