import { useState, useCallback, useMemo } from 'react';
import { TOOLS } from './toolRegistry';

let nextTabId = 1;

function createTab(toolId) {
  const tool = TOOLS[toolId];
  if (!tool) return null;

  return {
    id: `tab-${nextTabId++}`,
    toolId,
    toolName: tool.name,
    createdAt: Date.now(),
  };
}

export function useTabManager() {
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
  }, []);

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

  return {
    tabs,
    tabLabels,
    activeTabId,
    view,
    openTool,
    selectTab,
    closeTab,
    goHome,
  };
}
