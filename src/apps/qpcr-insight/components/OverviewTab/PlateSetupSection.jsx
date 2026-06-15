import { Fragment, useMemo, useState } from 'react';
import EmptyState from '../EmptyState';
import { EMPTY_WELL } from '../../constants/theme';

const ROWS = 'ABCDEFGH'.split('');
const COLS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function PlateSetupSection({ plateSetup, targetColors, sampleColors }) {
  const [colorBy, setColorBy] = useState('target');
  const [selectedWell, setSelectedWell] = useState(null);

  const wellByIndex = useMemo(() => {
    const map = {};
    (plateSetup?.wells || []).forEach((w) => {
      map[w.index] = w;
    });
    return map;
  }, [plateSetup]);

  const hasPlateData = (plateSetup?.wells || []).some(
    (w) => w.sampleName || w.targets?.length
  );

  if (!plateSetup || !hasPlateData) {
    return (
      <section className="qi-card">
        <h3 className="qi-section-title">Plate Setup</h3>
        <EmptyState
          icon="⊞"
          message={
            plateSetup
              ? 'No well assignments found in this file.'
              : "Plate layout isn't available for Excel imports."
          }
        />
      </section>
    );
  }

  const legendItems =
    colorBy === 'target'
      ? Object.entries(targetColors)
      : Object.entries(sampleColors);

  const getWellColor = (well) => {
    if (!well?.targets?.length && !well?.sampleName) return EMPTY_WELL;
    if (colorBy === 'target') {
      return targetColors[well.targets[0]] || EMPTY_WELL;
    }
    return sampleColors[well.sampleName] || EMPTY_WELL;
  };

  return (
    <section className="qi-card">
      <div className="qi-section-header">
        <h3 className="qi-section-title">Plate Setup</h3>
        <div className="qi-pill-toggle">
          <button
            type="button"
            className={colorBy === 'target' ? 'qi-pill-toggle__btn--active' : ''}
            onClick={() => setColorBy('target')}
          >
            By target
          </button>
          <button
            type="button"
            className={colorBy === 'sample' ? 'qi-pill-toggle__btn--active' : ''}
            onClick={() => setColorBy('sample')}
          >
            By sample
          </button>
        </div>
      </div>

      <div className="qi-well-grid-wrap">
        <div className="qi-well-grid">
          <div className="qi-well-grid__corner" />
          {COLS.map((col) => (
            <div key={`col-${col}`} className="qi-well-grid__col-label">
              {col}
            </div>
          ))}
          {ROWS.map((row, ri) => (
            <Fragment key={row}>
              <div className="qi-well-grid__row-label">{row}</div>
              {COLS.map((col) => {
                const index = ri * 12 + (col - 1);
                const well = wellByIndex[index] || {
                  index,
                  position: `${row}${col}`,
                  sampleName: '',
                  targets: [],
                };
                const hasContent = well.sampleName || well.targets?.length;
                return (
                  <button
                    key={index}
                    type="button"
                    className={`qi-well-circle${selectedWell === index ? ' qi-well-circle--selected' : ''}`}
                    style={{ backgroundColor: hasContent ? getWellColor(well) : EMPTY_WELL }}
                    title={well.position}
                    onClick={() => setSelectedWell(selectedWell === index ? null : index)}
                    aria-label={`Well ${well.position}`}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {selectedWell != null && wellByIndex[selectedWell] && (
        <div className="qi-well-popover">
          <strong>{wellByIndex[selectedWell].position}</strong>
          <span>{wellByIndex[selectedWell].sampleName || 'Empty'}</span>
          <span>
            Targets: {(wellByIndex[selectedWell].targets || []).join(', ') || '—'}
          </span>
        </div>
      )}

      <div className="qi-legend">
        {legendItems.map(([name, color]) => (
          <span key={name} className="qi-legend__item">
            <span className="qi-legend__swatch" style={{ backgroundColor: color }} />
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}
