import { useState, useCallback, useEffect } from 'react';

const FAVORITES_KEY = 'lab-tools-favorites';
const RECENT_KEY = 'lab-tools-recent-tools';
const MAX_RECENT = 6;

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function useToolPreferences() {
  const [favorites, setFavorites] = useState(() => readJson(FAVORITES_KEY, []));
  const [recent, setRecent] = useState(() => readJson(RECENT_KEY, []));

  useEffect(() => {
    writeJson(FAVORITES_KEY, favorites);
  }, [favorites]);

  useEffect(() => {
    writeJson(RECENT_KEY, recent);
  }, [recent]);

  const toggleFavorite = useCallback((toolId) => {
    setFavorites((prev) =>
      prev.includes(toolId)
        ? prev.filter((id) => id !== toolId)
        : [...prev, toolId]
    );
  }, []);

  const recordRecent = useCallback((toolId) => {
    setRecent((prev) => {
      const next = [toolId, ...prev.filter((id) => id !== toolId)];
      return next.slice(0, MAX_RECENT);
    });
  }, []);

  const isFavorite = useCallback(
    (toolId) => favorites.includes(toolId),
    [favorites]
  );

  return { favorites, recent, toggleFavorite, recordRecent, isFavorite };
}
