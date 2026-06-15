import { useLayoutDebug } from '../shared/useLayoutDebug';

export default function SettingsPanel({ theme, setTheme }) {
  const { layoutDebug, setLayoutDebug } = useLayoutDebug();

  return (
    <div className="settings-panel">
      <section className="settings-panel__section">
        <h3 className="lt-type-section-title">Appearance</h3>
        <label className="settings-panel__row">
          <span>Theme</span>
          <select
            className="lt-input"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </section>

      <section className="settings-panel__section">
        <h3 className="lt-type-section-title">Developer</h3>
        <label className="settings-panel__row settings-panel__row--checkbox">
          <span>Layout debug outlines</span>
          <input
            type="checkbox"
            checked={layoutDebug}
            onChange={(e) => setLayoutDebug(e.target.checked)}
          />
        </label>
        <p className="lt-type-body settings-panel__hint">
          Highlights component boundaries to diagnose overlap and overflow.
        </p>
      </section>

      <section className="settings-panel__section">
        <h3 className="lt-type-section-title">About</h3>
        <p className="lt-type-body">
          Lab Tools — molecular biology analysis platform for the Bloom Lab.
        </p>
        <dl className="settings-panel__meta">
          <dt>Modules</dt>
          <dd>qPCR Analysis, Gel, Endpoint, Colony Counter</dd>
          <dt>Utilities</dt>
          <dd>Notepad, Strain Reference, Lab Calculators</dd>
        </dl>
      </section>
    </div>
  );
}
