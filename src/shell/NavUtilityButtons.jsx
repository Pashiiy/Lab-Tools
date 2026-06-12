export default function NavUtilityButtons({
  notepadOpen,
  strainOpen,
  onToggleNotepad,
  onToggleStrain,
}) {
  return (
    <div className="shell-nav__utilities">
      <button
        type="button"
        className={`shell-nav__utility${notepadOpen ? ' shell-nav__utility--active' : ''}`}
        onClick={onToggleNotepad}
        aria-label="Lab notepad"
        title="Lab notepad"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6M10 13h4M10 17h4" />
        </svg>
        <span className="shell-nav__utility-label">Notes</span>
      </button>
      <button
        type="button"
        className={`shell-nav__utility${strainOpen ? ' shell-nav__utility--active' : ''}`}
        onClick={onToggleStrain}
        aria-label="Strain reference"
        title="Strain reference"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
          <path d="M8 7h8M8 11h6" />
        </svg>
        <span className="shell-nav__utility-label">Strains</span>
      </button>
    </div>
  );
}
