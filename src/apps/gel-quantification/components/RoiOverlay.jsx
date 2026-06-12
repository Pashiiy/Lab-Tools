import { memo } from 'react';

function RoiRect({ roi, className, label }) {
  if (!roi) return null;
  return (
    <g>
      <rect
        className={className}
        x={roi.x}
        y={roi.y}
        width={roi.width}
        height={roi.height}
        vectorEffect="non-scaling-stroke"
      />
      {label && (
        <text
          className="gq-roi__label"
          x={roi.x + 2}
          y={roi.y - 4}
          vectorEffect="non-scaling-stroke"
        >
          {label}
        </text>
      )}
    </g>
  );
}

function RoiOverlay({ rois, activeRoiId, width, height }) {
  return (
    <svg
      className="gq-viewer__roi-layer"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      {rois?.map((roi) => {
        const isActive = roi.id === activeRoiId;
        const isControl = roi.role === 'CONTROL';
        const isTarget = roi.role === 'TARGET';
        const label = roi.displayName || roi.name;
        const outerClass = [
          'gq-roi',
          'gq-roi--outer',
          isActive ? 'gq-roi--active' : 'gq-roi--inactive',
          isControl ? 'gq-roi--control' : '',
          isTarget ? 'gq-roi--target' : '',
        ]
          .filter(Boolean)
          .join(' ');
        const innerClass = [
          'gq-roi',
          'gq-roi--inner',
          isActive ? 'gq-roi--active' : 'gq-roi--inactive',
          isControl ? 'gq-roi--control' : '',
          isTarget ? 'gq-roi--target' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <g key={roi.id}>
            <RoiRect roi={roi.outerROI} className={outerClass} />
            <RoiRect roi={roi.innerROI} className={innerClass} label={label} />
          </g>
        );
      })}
    </svg>
  );
}

export default memo(RoiOverlay);
