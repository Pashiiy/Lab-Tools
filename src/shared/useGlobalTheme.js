import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'lab-tools-theme';
const LEGACY_STORAGE_KEY = 'colony-counter-theme';

function getInitialTheme() {
  const saved =
    localStorage.getItem(STORAGE_KEY) ||
    localStorage.getItem(LEGACY_STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyGlobalTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY, theme);
}

export function useGlobalTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    applyGlobalTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, setTheme, toggleTheme };
}
