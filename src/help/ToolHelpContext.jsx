import { createContext, useCallback, useContext, useMemo, useRef } from 'react';

const ToolHelpContext = createContext(null);

export function ToolHelpProvider({ children }) {
  const openHandlerRef = useRef(null);

  const registerHelpHandler = useCallback((handler) => {
    openHandlerRef.current = handler;
  }, []);

  const openHelp = useCallback(() => {
    openHandlerRef.current?.();
  }, []);

  const value = useMemo(
    () => ({ registerHelpHandler, openHelp }),
    [registerHelpHandler, openHelp]
  );

  return <ToolHelpContext.Provider value={value}>{children}</ToolHelpContext.Provider>;
}

export function useToolHelp() {
  const ctx = useContext(ToolHelpContext);
  if (!ctx) {
    throw new Error('useToolHelp must be used within ToolHelpProvider');
  }
  return ctx;
}
