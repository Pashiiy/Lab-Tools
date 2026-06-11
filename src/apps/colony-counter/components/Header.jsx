import { useState, useEffect, useRef } from 'react';

export default function Header({
  sessionName,
  onSessionNameChange,
  isDirty,
  showSavedFlash,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(sessionName || '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!editing) setDraft(sessionName || '');
  }, [sessionName, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commitName = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== sessionName) {
      onSessionNameChange(trimmed);
    } else {
      setDraft(sessionName || '');
    }
  };

  return (
    <header className="header">
      <div className="header__left">
        <h1 className="header__title">Colony Counter</h1>
        {sessionName !== null && (
          <>
            <span className="header__divider">|</span>
            <div className="header__session">
              {editing ? (
                <input
                  ref={inputRef}
                  className="header__session-input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commitName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitName();
                    if (e.key === 'Escape') {
                      setDraft(sessionName || '');
                      setEditing(false);
                    }
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="header__session-name"
                  onClick={() => setEditing(true)}
                  title="Click to rename session"
                >
                  {sessionName || 'Untitled'}
                </button>
              )}
              <span
                className={`header__status-dot${isDirty ? ' header__status-dot--dirty' : ' header__status-dot--saved'}`}
                title={isDirty ? 'Unsaved changes' : 'Saved'}
              />
              {showSavedFlash ? (
                <span className="header__status-text header__status-text--saved">
                  Saved just now
                </span>
              ) : isDirty ? (
                <span className="header__status-text">Unsaved changes</span>
              ) : null}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
