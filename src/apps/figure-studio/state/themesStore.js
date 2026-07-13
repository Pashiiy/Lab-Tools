const KEY = 'benchy-figure-studio-themes';

export function listThemes() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveTheme(theme) {
  const id = `theme-${Date.now().toString(36)}`;
  const entry = { ...theme, id };
  const next = [entry, ...listThemes().filter((t) => t.label !== theme.label)].slice(0, 20);
  localStorage.setItem(KEY, JSON.stringify(next));
  return entry;
}

export function getSavedTheme(id) {
  return listThemes().find((t) => t.id === id) || null;
}
