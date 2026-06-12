import { useState, useCallback, useEffect, useRef } from 'react';

const STORAGE_KEY = 'lab-tools-notepad';

function loadNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { text: '', updatedAt: null };
    const parsed = JSON.parse(raw);
    return {
      text: parsed.text ?? '',
      updatedAt: parsed.updatedAt ?? null,
    };
  } catch {
    return { text: '', updatedAt: null };
  }
}

export function useNotepad() {
  const [text, setText] = useState(() => loadNotes().text);
  const [updatedAt, setUpdatedAt] = useState(() => loadNotes().updatedAt);
  const timerRef = useRef(null);

  const persist = useCallback((value) => {
    const ts = Date.now();
    setUpdatedAt(ts);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ text: value, updatedAt: ts })
    );
  }, []);

  const updateText = useCallback(
    (value) => {
      setText(value);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => persist(value), 400);
    },
    [persist]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const insertTimestamp = useCallback(() => {
    const stamp = new Date().toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const prefix = text && !text.endsWith('\n') ? '\n' : '';
    updateText(`${text}${prefix}[${stamp}] `);
  }, [text, updateText]);

  return { text, updatedAt, updateText, insertTimestamp };
}
