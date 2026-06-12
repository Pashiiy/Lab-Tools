export default function Header({
  strainName,
  setStrainName,
  colonyCount,
  setColonyCount,
  onExport,
}) {
  return (
    <header className="header" data-tour="ea-header">
      <h1 className="header__title">Endpoint Analyzer</h1>
      <div className="header__controls">
        <label className="header__field">
          <span className="header__label">Strain</span>
          <input
            type="text"
            className="header__input"
            value={strainName}
            onChange={(e) => setStrainName(e.target.value)}
            placeholder="strain name"
          />
        </label>
        <label className="header__field">
          <span className="header__label">Colonies</span>
          <input
            type="number"
            className="header__input header__input--number"
            value={colonyCount}
            min={1}
            max={999}
            onChange={(e) => setColonyCount(e.target.value)}
          />
        </label>
        <button type="button" className="header__export" data-tour="ea-export" onClick={onExport}>
          Export Excel
        </button>
      </div>
    </header>
  );
}
