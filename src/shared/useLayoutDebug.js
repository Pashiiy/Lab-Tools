import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'lab-tools-layout-debug';

function applyLayoutDebug(enabled) {
  if (enabled) {
    document.documentElement.setAttribute('data-layout-debug', 'true');
  } else {
    document.documentElement.removeAttribute('data-layout-debug');
  }
}

export function useLayoutDebug() {
  const [layoutDebug, setLayoutDebugState] = useState(
    () => localStorage.getItem(STORAGE_KEY) === 'true'
  );

  useEffect(() => {
    applyLayoutDebug(layoutDebug);
    localStorage.setItem(STORAGE_KEY, layoutDebug ? 'true' : 'false');
  }, [layoutDebug]);

  const setLayoutDebug = useCallback((value) => {
    setLayoutDebugState(Boolean(value));
  }, []);

  return { layoutDebug, setLayoutDebug };
}
