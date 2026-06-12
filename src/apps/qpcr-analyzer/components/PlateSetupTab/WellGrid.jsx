import { Fragment } from 'react';
import WellCircle from './WellCircle';

const ROWS = 'ABCDEFGH'.split('');
const COLS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function WellGrid({
  wells,
  colorBy,
  targetColors,
  sampleColors,
  selectedWells,
  omittedWells,
  onWellClick,
}) {
  const wellByIndex = Object.fromEntries(wells.map((w) => [w.index, w]));

  const isWellOmitted = (well) => {
    if (!well.reactions.length) return false;
    return well.reactions.every((r) =>
      omittedWells.has(`${well.index}-${r.targetName}`)
    );
  };

  return (
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
              return (
                <WellCircle
                  key={index}
                  well={well}
                  colorBy={colorBy}
                  targetColors={targetColors}
                  sampleColors={sampleColors}
                  selected={selectedWells.has(index)}
                  omitted={isWellOmitted(well)}
                  onClick={(shiftKey) => onWellClick(index, shiftKey)}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
