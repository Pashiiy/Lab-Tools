/**
 * Launcher metadata for the tool dashboard.
 * Registry (toolRegistry.js) owns components; manifest owns presentation.
 */

export const TOOL_CATEGORIES = {
  analysis: { id: 'analysis', label: 'Analysis', order: 1 },
  visualization: { id: 'visualization', label: 'Visualization', order: 2 },
  future: { id: 'future', label: 'Coming Soon', order: 3 },
};

export const TOOL_MANIFEST = {
  'endpoint-analysis': {
    category: 'analysis',
    tags: ['gel', 'colony', 'repair', 'excel'],
    hint: 'Gel scoring · colony classification · Excel charts',
    accent: 'var(--lt-brand-blue)',
    Icon: 'endpoint',
  },
  'colony-counter': {
    category: 'analysis',
    tags: ['cfu', 'petri', 'imaging', 'counting'],
    hint: 'Petri dish marking · CFU calculator · session files',
    accent: 'var(--lt-brand-blue)',
    Icon: 'colony',
  },
  'gel-quantification': {
    category: 'analysis',
    tags: ['roi', 'fiji', 'gel', 'quantification'],
    hint: 'Box-in-box correction · pair ratios · multi-sheet export',
    accent: 'var(--lt-brand-blue)',
    Icon: 'gel',
  },
  'qpcr-analyzer': {
    category: 'analysis',
    tags: ['qpcr', 'eds', 'ct', 'amplification'],
    hint: '.eds / .xlsx import · ΔΔCt · time course · standard curves',
    accent: 'var(--lt-brand-blue)',
    Icon: 'qpcr',
  },
  'figure-generator': {
    category: 'visualization',
    tags: ['figure', 'chart', 'publication', 'csv', 'excel'],
    hint: 'Bar · scatter · box · violin · PNG/SVG/PDF export',
    accent: 'var(--lt-brand-blue)',
    Icon: 'figure',
    archived: true,
  },
};

export function getManifest(toolId) {
  return TOOL_MANIFEST[toolId] ?? {
    category: 'analysis',
    tags: [],
    hint: '',
    accent: 'var(--lt-accent)',
    Icon: 'endpoint',
  };
}

export function isToolArchived(toolId) {
  return Boolean(TOOL_MANIFEST[toolId]?.archived);
}

export function getActiveTools(toolList) {
  return toolList.filter((tool) => !isToolArchived(tool.id));
}
