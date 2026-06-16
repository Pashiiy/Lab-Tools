import { useState, useCallback, useMemo } from 'react';
import { TOOLS } from './toolRegistry';

let nextTabId = 1;

function createTab(toolId, initialState = null, id = null) {
  const tool = TOOLS[toolId];
  if (!tool) return null;

  return {
    id: id ?? `tab-${nextTabId++}`,
    toolId,
    toolName: tool.name,
    createdAt: Date.now(),
    initialState,
  };
}

/** Keep the id counter ahead of any restored `tab-N` ids to avoid collisions. */
function bumpCounterPast(ids) {
  for (const id of ids) {
    const match = /tab-(\d+)/.exec(id ?? '');
    if (match) nextTabId = Math.max(nextTabId, parseInt(match[1], 10) + 1);
  }
}

export function useTabManager({ onToolOpened } = {}) {
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [view, setView] = useState('home');

  const tabLabels = useMemo(() => {
    const counts = {};
    const labels = {};

    tabs.forEach((tab) => {
      counts[tab.toolId] = (counts[tab.toolId] || 0) + 1;
      labels[tab.id] = `${tab.toolName} (${counts[tab.toolId]})`;
    });

    return labels;
  }, [tabs]);

  const openTool = useCallback((toolId) => {
    const tab = createTab(toolId);
    if (!tab) return;

    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
    setView('tool');
    onToolOpened?.(toolId);
  }, [onToolOpened]);

  const selectTab = useCallback((tabId) => {
    setActiveTabId(tabId);
    setView('tool');
  }, []);

  const closeTab = useCallback((tabId) => {
    setTabs((prev) => {
      const index = prev.findIndex((t) => t.id === tabId);
      if (index === -1) return prev;

      const next = prev.filter((t) => t.id !== tabId);

      setActiveTabId((current) => {
        if (current !== tabId) return current;
        if (next.length === 0) return null;
        const nextIndex = Math.min(index, next.length - 1);
        return next[nextIndex].id;
      });

      if (next.length === 0) {
        setView('home');
      }

      return next;
    });
  }, []);

  const goHome = useCallback(() => {
    setView('home');
  }, []);

  /**
   * Restore a full workspace from a saved `.labtools` project. Recreates tabs
   * with their ORIGINAL ids (so tool state maps correctly) and attaches each
   * tool's serialized state as `initialState` for the tool hook to hydrate.
   */
  const restoreWorkspace = useCallback((workspace, toolStates = {}) => {
    const restoredTabs = (workspace?.tabs ?? [])
      .map((t) => createTab(t.toolId, toolStates[t.id]?.state ?? null, t.id))
      .filter(Boolean);
    bumpCounterPast(restoredTabs.map((t) => t.id));
    setTabs(restoredTabs);
    if (restoredTabs.length === 0) {
      setActiveTabId(null);
      setView('home');
      return;
    }
    const active =
      restoredTabs.find((t) => t.id === workspace.activeTabId)?.id ?? restoredTabs[0].id;
    setActiveTabId(active);
    setView('tool');
  }, []);

  return {
    tabs,
    tabLabels,
    activeTabId,
    view,
    openTool,
    selectTab,
    closeTab,
    goHome,
    restoreWorkspace,
  };
}
