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

let nextCatNum = 4;

export const DEFAULT_CATEGORIES = [
  { id: 'cat-1', label: 'Yeast', color: '#E8E8E8' },
  { id: 'cat-2', label: 'Contaminant', color: '#E11D48' },
  { id: 'cat-3', label: 'Uncertain', color: '#F59E0B' },
];

/** Map auto colonyType → category id/color helpers */
export const COLONY_TYPE_META = {
  yeast: { label: 'Yeast', color: '#E8E8E8', stroke: 'rgba(240,240,245,0.95)' },
  contaminant: { label: 'Contaminant', color: '#E11D48', stroke: 'rgba(244,63,94,0.95)' },
  uncertain: { label: 'Uncertain', color: '#F59E0B', stroke: 'rgba(245,158,11,0.95)', dashed: true },
};

export function ensureTypeCategories(categories) {
  const next = [...categories];
  const byLabel = new Map(next.map((c) => [c.label.toLowerCase(), c]));
  for (const [type, meta] of Object.entries(COLONY_TYPE_META)) {
    void type;
    if (!byLabel.has(meta.label.toLowerCase())) {
      const cat = createCategory(next);
      cat.label = meta.label;
      cat.color = meta.color;
      next.push(cat);
      byLabel.set(meta.label.toLowerCase(), cat);
    }
  }
  return next;
}

export function categoryForColonyType(categories, colonyType) {
  const meta = COLONY_TYPE_META[colonyType] || COLONY_TYPE_META.yeast;
  const hit = categories.find((c) => c.label.toLowerCase() === meta.label.toLowerCase());
  return hit || categories[0] || null;
}

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
