import { useState } from 'react';
import { useNotepad } from './useNotepad';
import { calcDilution, calcMasterMix } from './labCalculators';
import './notepad-panel.css';

function formatTimestamp(ms) {
  if (!ms) return 'Not saved yet';
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function DilutionCalculator() {
  const [c1, setC1] = useState('');
  const [c2, setC2] = useState('');
  const [v2, setV2] = useState('');

  const result = calcDilution(
    parseFloat(c1),
    parseFloat(v2),
    parseFloat(c2)
  );

  return (
    <div className="notepad-calc">
      <h3 className="notepad-calc__title">Dilution (C₁V₁ = C₂V₂)</h3>
      <div className="notepad-calc__grid">
        <label>
          <span>Starting conc. (C₁)</span>
          <input
            type="number"
            className="lt-input"
            value={c1}
            onChange={(e) => setC1(e.target.value)}
            min="0"
            step="any"
          />
        </label>
        <label>
          <span>Desired conc. (C₂)</span>
          <input
            type="number"
            className="lt-input"
            value={c2}
            onChange={(e) => setC2(e.target.value)}
            min="0"
            step="any"
          />
        </label>
        <label>
          <span>Final volume (V₂)</span>
          <input
            type="number"
            className="lt-input"
            value={v2}
            onChange={(e) => setV2(e.target.value)}
            min="0"
            step="any"
          />
        </label>
      </div>
      {result.valid ? (
        <dl className="notepad-calc__result">
          <dt>Stock volume (V₁)</dt>
          <dd>{result.stockVolume.toFixed(3)}</dd>
          <dt>Diluent volume</dt>
          <dd>{result.diluentVolume.toFixed(3)}</dd>
        </dl>
      ) : (
        <p className="notepad-calc__hint">
          {result.error || 'Enter positive values for all fields'}
        </p>
      )}
    </div>
  );
}

function MasterMixCalculator() {
  const [reactions, setReactions] = useState('10');
  const [overage, setOverage] = useState('10');
  const [useOverage, setUseOverage] = useState(true);

  const result = calcMasterMix(
    reactions,
    useOverage ? overage : 0
  );

  return (
    <div className="notepad-calc">
      <h3 className="notepad-calc__title">PCR Master Mix (GoTaq)</h3>
      <div className="notepad-calc__grid notepad-calc__grid--inline">
        <label>
          <span>Reactions</span>
          <input
            type="number"
            className="lt-input"
            value={reactions}
            onChange={(e) => setReactions(e.target.value)}
            min="1"
            step="1"
          />
        </label>
        <label className="notepad-calc__check">
          <input
            type="checkbox"
            checked={useOverage}
            onChange={(e) => setUseOverage(e.target.checked)}
          />
          <span>+{overage}% overage</span>
        </label>
        {useOverage && (
          <label>
            <span>Overage %</span>
            <input
              type="number"
              className="lt-input"
              value={overage}
              onChange={(e) => setOverage(e.target.value)}
              min="0"
              step="1"
            />
          </label>
        )}
      </div>

      <p className="notepad-calc__subtitle">Per reaction ({result.perReactionTotal} µL)</p>
      <table className="notepad-calc__table">
        <thead>
          <tr>
            <th>Component</th>
            <th>µL</th>
          </tr>
        </thead>
        <tbody>
          {result.perReaction.map((row) => (
            <tr key={row.component}>
              <td>{row.component}</td>
              <td>{row.volume.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="notepad-calc__subtitle">
        Totals — {result.reactions} reactions
        {useOverage && result.overagePercent > 0
          ? ` + ${result.overagePercent}%`
          : ''}
      </p>
      <table className="notepad-calc__table">
        <tbody>
          {result.totals.map((row) => (
            <tr key={row.component}>
              <td>{row.component}</td>
              <td>{row.volume.toFixed(1)} µL</td>
            </tr>
          ))}
          <tr className="notepad-calc__total-row">
            <td>Total mix</td>
            <td>{result.totalMix.toFixed(1)} µL</td>
          </tr>
        </tbody>
      </table>
      <p className="notepad-calc__footnote">Template added separately per reaction.</p>
    </div>
  );
}

export default function NotepadPanel() {
  const { text, updatedAt, updateText, insertTimestamp } = useNotepad();
  const [calcTab, setCalcTab] = useState('dilution');

  return (
    <div className="notepad-panel">
      <section className="notepad-panel__notes">
        <div className="notepad-panel__notes-toolbar">
          <button type="button" className="lt-btn" onClick={insertTimestamp}>
            Insert timestamp
          </button>
          <span className="notepad-panel__saved">
            Auto-saved · {formatTimestamp(updatedAt)}
          </span>
        </div>
        <textarea
          className="notepad-panel__textarea lt-input"
          value={text}
          onChange={(e) => updateText(e.target.value)}
          placeholder="Lab notes, observations, protocol tweaks…"
          rows={10}
        />
      </section>

      <section className="notepad-panel__calcs">
        <div className="notepad-panel__calc-tabs">
          <button
            type="button"
            className={`lt-btn${calcTab === 'dilution' ? ' lt-btn--active' : ''}`}
            onClick={() => setCalcTab('dilution')}
          >
            Dilution
          </button>
          <button
            type="button"
            className={`lt-btn${calcTab === 'pcr' ? ' lt-btn--active' : ''}`}
            onClick={() => setCalcTab('pcr')}
          >
            PCR Mix
          </button>
        </div>
        {calcTab === 'dilution' ? <DilutionCalculator /> : <MasterMixCalculator />}
      </section>
    </div>
  );
}
