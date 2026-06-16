import { useState, useEffect, useRef } from 'react';

/** Inline session name editor for ToolHeader — colony counter only. */
export default function SessionNameEditor({
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

  if (sessionName === null) return null;

  return (
    <div className="cc-session-name">
      <span className="cc-session-name__divider" aria-hidden>|</span>
      {editing ? (
        <input
          ref={inputRef}
          className="cc-session-name__input lt-input"
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
          className="cc-session-name__btn"
          onClick={() => setEditing(true)}
          title="Click to rename session"
        >
          {sessionName || 'Untitled'}
        </button>
      )}
      <span
        className={`cc-session-name__dot${isDirty ? ' cc-session-name__dot--dirty' : ''}`}
        title={isDirty ? 'Unsaved changes' : 'Saved'}
      />
      {showSavedFlash ? (
        <span className="cc-session-name__status">Saved just now</span>
      ) : isDirty ? (
        <span className="cc-session-name__status cc-session-name__status--dirty">Unsaved</span>
      ) : null}
    </div>
  );
}
