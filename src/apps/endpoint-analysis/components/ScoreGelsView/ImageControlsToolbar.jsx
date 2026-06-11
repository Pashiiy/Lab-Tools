import { clamp } from '../GelPanel/gelUtils';

const CONTROLS = [
  { key: 'brightness', icon: '☀', label: 'Brightness', min: 50, max: 200, unit: '%' },
  { key: 'contrast', icon: '◑', label: 'Contrast', min: 50, max: 200, unit: '%' },
  { key: 'shadows', icon: '☁', label: 'Shadows', min: 0, max: 100, unit: '%' },
  { key: 'rotation', icon: '↻', label: 'Rotation', min: -180, max: 180, unit: '°' },
  { key: 'zoom', icon: '🔍', label: 'Zoom', min: 50, max: 300, unit: '%' },
];

export default function ImageControlsToolbar({ gel, onUpdate, onReset }) {
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
    <div className="image-toolbar">
      <div className="image-toolbar__controls">
        {CONTROLS.map(({ key, icon, min, max, unit }) => (
          <div key={key} className="image-toolbar__control">
            <span className="image-toolbar__icon" title={key}>
              {icon}
            </span>
            <input
              type="range"
              className="image-toolbar__slider"
              min={min}
              max={max}
              step={1}
              value={gel[key]}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (key === 'zoom') handleZoomChange(value);
                else onUpdate(key, value);
              }}
              aria-label={key}
            />
            <span className="image-toolbar__value">
              {gel[key]}
              {unit}
            </span>
            {key === 'rotation' && (
              <>
                <button
                  type="button"
                  className="image-toolbar__snap"
                  onClick={() => handleRotation(-90)}
                  aria-label="Rotate -90 degrees"
                >
                  ↺
                </button>
                <button
                  type="button"
                  className="image-toolbar__snap"
                  onClick={() => handleRotation(90)}
                  aria-label="Rotate +90 degrees"
                >
                  ↻
                </button>
              </>
            )}
          </div>
        ))}
      </div>
      <button type="button" className="image-toolbar__reset" onClick={onReset}>
        Reset
      </button>
    </div>
  );
}
