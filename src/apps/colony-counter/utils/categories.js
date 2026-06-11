const COLOR_PALETTE = [
  '#FF3B3B',
  '#00E5A0',
  '#3B82F6',
  '#F59E0B',
  '#A855F7',
  '#EC4899',
  '#14B8A6',
  '#EF4444',
];

let nextCatNum = 2;

export const DEFAULT_CATEGORIES = [
  { id: 'cat-1', label: 'Colony Type A', color: '#FF3B3B' },
];

export function pickDistinctColor(existingCategories) {
  const used = new Set(existingCategories.map((c) => c.color));
  const available = COLOR_PALETTE.filter((c) => !used.has(c));
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
}

export function createCategory(existingCategories) {
  const id = `cat-${nextCatNum++}`;
  return {
    id,
    label: `Category ${existingCategories.length + 1}`,
    color: pickDistinctColor(existingCategories),
  };
}

export function getCategoryCounts(dots, categories) {
  const counts = {};
  categories.forEach((cat) => {
    counts[cat.id] = 0;
  });
  dots.forEach((dot) => {
    if (counts[dot.categoryId] !== undefined) {
      counts[dot.categoryId]++;
    }
  });
  return counts;
}
