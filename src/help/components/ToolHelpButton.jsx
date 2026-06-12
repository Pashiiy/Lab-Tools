export default function ToolHelpButton({ onClick, label = 'Help' }) {
  return (
    <button
      type="button"
      className="tool-help-btn"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
        <path
          d="M9.5 9.5a2.5 2.5 0 0 1 4.5 1.5c0 2-2.5 2-2.5 3.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <circle cx="12" cy="17" r="0.75" fill="currentColor" />
      </svg>
    </button>
  );
}
