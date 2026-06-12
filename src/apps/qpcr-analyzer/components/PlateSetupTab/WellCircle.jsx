import { EMPTY_WELL } from '../../constants/palette';

function splitColors(targets, targetColors) {
  if (!targets.length) return [EMPTY_WELL];
  return targets.map((t) => targetColors[t] || '#666');
}

export default function WellCircle({
  well,
  colorBy,
  targetColors,
  sampleColors,
  selected,
  omitted,
  onClick,
  styleOverride,
  filterHighlighted,
}) {
  const isEmpty = !well.sampleName && well.reactions.length === 0;
  const targets = well.reactions.map((r) => r.targetName).filter(Boolean);
  const uniqueTargets = [...new Set(targets)];

  let fill;
  if (styleOverride) {
    fill = styleOverride;
  } else if (isEmpty) {
    fill = null;
  } else if (colorBy === 'sample') {
    fill = sampleColors[well.sampleName] || '#666';
  } else {
    const colors = splitColors(uniqueTargets, targetColors);
    fill = colors.length === 1 ? colors[0] : null;
  }

  const multiColors =
    !styleOverride && colorBy === 'target' && uniqueTargets.length > 1
      ? splitColors(uniqueTargets, targetColors)
      : null;

  return (
    <button
      type="button"
      className={[
        'well-circle',
        isEmpty ? 'well-circle--empty' : '',
        selected ? 'well-circle--selected' : '',
        filterHighlighted ? 'well-circle--filter-highlight' : '',
        omitted ? 'well-circle--omitted' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={(e) => onClick(e.shiftKey)}
      title={`${well.position}${well.sampleName ? ` — ${well.sampleName}` : ''}`}
      aria-label={`Well ${well.position}`}
    >
      {multiColors ? (
        <svg width="36" height="36" viewBox="0 0 36 36">
          {multiColors.map((color, i) => {
            const angle = (360 / multiColors.length) * i;
            const nextAngle = (360 / multiColors.length) * (i + 1);
            const r = 16;
            const cx = 18;
            const cy = 18;
            const x1 = cx + r * Math.cos((angle * Math.PI) / 180);
            const y1 = cy + r * Math.sin((angle * Math.PI) / 180);
            const x2 = cx + r * Math.cos((nextAngle * Math.PI) / 180);
            const y2 = cy + r * Math.sin((nextAngle * Math.PI) / 180);
            const large = nextAngle - angle > 180 ? 1 : 0;
            return (
              <path
                key={i}
                d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
                fill={color}
              />
            );
          })}
          <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.15)" />
        </svg>
      ) : (
        <span
          className="well-circle__fill"
          style={{ background: fill || 'transparent' }}
        />
      )}
      {omitted && <span className="well-circle__omit">✕</span>}
    </button>
  );
}
