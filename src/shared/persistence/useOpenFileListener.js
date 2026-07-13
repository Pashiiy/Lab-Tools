import { useEffect } from 'react';

/**
 * Listen for `benchy:open-file` events dispatched when the user reopens a
 * file from Recent Files. Each tool registers its handler once on mount.
 */
export function useOpenFileListener(toolId, handler) {
  useEffect(() => {
    if (!toolId || !handler) return undefined;
    const onOpen = (e) => {
      if (e.detail?.toolId !== toolId || !e.detail?.file) return;
      handler(e.detail.file);
    };
    window.addEventListener('benchy:open-file', onOpen);
    return () => window.removeEventListener('benchy:open-file', onOpen);
  }, [toolId, handler]);
}
