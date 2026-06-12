import { Fragment, useRef } from 'react';
import WellCircle from '../PlateSetupTab/WellCircle';
import { getPlateWellColor, getFilterHighlightedWells } from '../../utils/workspaceFilters';

const ROWS = 'ABCDEFGH'.split('');
const COLS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function InteractivePlate({
  wells,
  plateColorBy,
  targetColors,
  sampleColors,
  plateSelectedWells,
  filterSamples,
  filterTargets,
  omittedWells,
  onWellPointerDown,
  onWellPointerEnter,
  onClearSelection,
  onDragEnd,
}) {
  const wellByIndex = Object.fromEntries(wells.map((w) => [w.index, w]));
  const filterHighlighted = getFilterHighlightedWells(
    { wells },
    filterSamples,
    filterTargets
  );
  const dragging = useRef(false);

  const isWellOmitted = (well) => {
    if (!well.reactions.length) return false;
    return well.reactions.every((r) =>
      omittedWells.has(`${well.index}-${r.targetName}`)
    );
  };

  const getWellColorOverride = (well) => {
    if (plateColorBy === 'target' && well.reactions.length > 0) {
      return null;
    }
    const color = getPlateWellColor(
      well,
      plateColorBy,
      sampleColors,
      targetColors,
      plateSelectedWells,
      filterHighlighted
    );
    return color;
  };

  const handleMouseDown = (index, e) => {
    dragging.current = true;
    onWellPointerDown(index, {
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
    });
  };

  const handleMouseEnter = (index) => {
    if (dragging.current) onWellPointerEnter(index);
  };

  const handleMouseUp = () => {
    dragging.current = false;
    onDragEnd?.();
  };

  return (
    <div
      className="ws-plate"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="ws-plate__toolbar">
        <span className="ws-plate__hint">
          Click · Shift+click range · Drag select · ⌘/Ctrl toggle
        </span>
        {plateSelectedWells.size > 0 && (
          <button type="button" className="btn-ghost" onClick={onClearSelection}>
            Clear selection ({plateSelectedWells.size})
          </button>
        )}
      </div>
      <div className="well-grid-wrap">
        <div className="well-grid">
          <div className="well-grid__corner" />
          {COLS.map((col) => (
            <div key={`col-${col}`} className="well-grid__col-label">
              {col}
            </div>
          ))}
          {ROWS.map((row, ri) => (
            <Fragment key={row}>
              <div className="well-grid__row-label">{row}</div>
              {COLS.map((col) => {
                const index = ri * 12 + (col - 1);
                const well = wellByIndex[index] || {
                  index,
                  position: `${row}${col}`,
                  sampleName: '',
                  reactions: [],
                };
                const dimmed =
                  (filterSamples.size > 0 || filterTargets.size > 0) &&
                  !filterHighlighted.has(index) &&
                  !plateSelectedWells.has(index);
                const colorOverride = getWellColorOverride(well);

                return (
                  <div
                    key={index}
                    className={`ws-plate-well${dimmed ? ' ws-plate-well--dimmed' : ''}`}
                    onMouseDown={(e) => handleMouseDown(index, e)}
                    onMouseEnter={() => handleMouseEnter(index)}
                  >
                    <WellCircle
                      well={well}
                      colorBy={plateColorBy === 'target' ? 'target' : 'sample'}
                      targetColors={targetColors}
                      sampleColors={sampleColors}
                      selected={plateSelectedWells.has(index)}
                      omitted={isWellOmitted(well)}
                      onClick={() => {}}
                      styleOverride={colorOverride}
                      filterHighlighted={
                        filterHighlighted.has(index) &&
                        !plateSelectedWells.has(index)
                      }
                    />
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
