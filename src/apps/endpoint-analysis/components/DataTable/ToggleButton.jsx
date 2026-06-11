export default function ToggleButton({ value, onChange, size = 'normal' }) {
  const isCompact = size === 'compact';

  return (
    <button
      type="button"
      className={`toggle${value === 1 ? ' toggle--checked' : ''}${isCompact ? ' score-toggle' : ''}`}
      onClick={() => onChange(value === 1 ? 0 : 1)}
      aria-label={value === 1 ? 'checked' : 'unchecked'}
    >
      {value === 1 ? '✓' : ''}
    </button>
  );
}
