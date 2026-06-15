import { REPAIR_COLORS } from '../../constants/categories';
import { getOverviewRepairProductLabel } from '../../utils/colonyDisplay';
import ToggleButton from './ToggleButton';

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function isAllZeros(colony) {
  return (
    colony.galcen === 0 &&
    colony.cen3 === 0 &&
    colony.rearrangement === 0 &&
    colony.reciprocal === 0
  );
}

function hasAnyChecked(colony) {
  return (
    colony.galcen === 1 ||
    colony.cen3 === 1 ||
    colony.rearrangement === 1 ||
    colony.reciprocal === 1
  );
}

function getRowStyle(colony, classification) {
  if (isAllZeros(colony)) {
    return {};
  }

  if (classification.categoryId && classification.categoryId !== '?') {
    const color = REPAIR_COLORS[classification.repairProduct];
    return { backgroundColor: hexToRgba(color, 0.1) };
  }

  if (hasAnyChecked(colony)) {
    return { backgroundColor: 'rgba(224, 92, 92, 0.1)' };
  }

  return {};
}

function CategoryBadge({ classification }) {
  const { categoryId, repairProduct } = classification;

  if (categoryId === '?') {
    return (
      <span className="category-badge category-badge--unknown" title="Unknown combination">
        !
      </span>
    );
  }

  const color = REPAIR_COLORS[repairProduct];
  return (
    <span className="category-badge" style={{ backgroundColor: color }}>
      {categoryId}
    </span>
  );
}

export default function ColonyRow({ colony, onToggle }) {
  const { classification } = colony;
  const repairLabel = getOverviewRepairProductLabel(colony, classification);
  const productColor =
    repairLabel.variant === 'failed-pcr'
      ? 'var(--negative)'
      : repairLabel.variant === 'unassigned'
        ? REPAIR_COLORS.UNCLASSIFIED
        : REPAIR_COLORS[classification.repairProduct];

  return (
    <tr
      className={isAllZeros(colony) ? 'colony-row--dim' : ''}
      style={getRowStyle(colony, classification)}
    >
      <td className="colony-cell">{colony.id}</td>
      <td>
        <ToggleButton
          value={colony.galcen}
          onChange={(v) => onToggle(colony.id, 'galcen', v)}
        />
      </td>
      <td>
        <ToggleButton
          value={colony.cen3}
          onChange={(v) => onToggle(colony.id, 'cen3', v)}
        />
      </td>
      <td>
        <ToggleButton
          value={colony.rearrangement}
          onChange={(v) => onToggle(colony.id, 'rearrangement', v)}
        />
      </td>
      <td>
        <ToggleButton
          value={colony.reciprocal}
          onChange={(v) => onToggle(colony.id, 'reciprocal', v)}
        />
      </td>
      <td>
        <CategoryBadge classification={classification} />
      </td>
      <td>
        <span
          className={`repair-product${
            repairLabel.variant === 'failed-pcr' ? ' repair-product--failed-pcr' : ''
          }`}
          style={{ color: productColor }}
        >
          {repairLabel.text}
        </span>
      </td>
    </tr>
  );
}
