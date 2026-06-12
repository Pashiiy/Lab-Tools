/**
 * Application sidebar navigation structure.
 * Tools map to toolRegistry ids; extend here for future modules.
 */

export const SIDEBAR_NAV = [
  { type: 'item', id: 'dashboard', label: 'Dashboard', action: 'home', icon: 'dashboard' },
  { type: 'divider' },
  { type: 'item', id: 'qpcr-analyzer', label: 'qPCR Analysis', action: 'tool', toolId: 'qpcr-analyzer', icon: 'qpcr' },
  { type: 'item', id: 'gel-quantification', label: 'Gel Analysis', action: 'tool', toolId: 'gel-quantification', icon: 'gel' },
  { type: 'item', id: 'figure-generator', label: 'Figure Generator', action: 'tool', toolId: 'figure-generator', icon: 'figure' },
  { type: 'divider' },
  {
    type: 'group',
    id: 'tools',
    label: 'Tools',
    icon: 'tools',
    children: [
      { id: 'endpoint-analysis', label: 'Endpoint Analysis', toolId: 'endpoint-analysis', icon: 'endpoint' },
      { id: 'colony-counter', label: 'Colony Counter', toolId: 'colony-counter', icon: 'colony' },
    ],
  },
  { type: 'divider' },
  { type: 'item', id: 'settings', label: 'Settings', action: 'settings', icon: 'settings' },
];

export function getAllToolIds() {
  const ids = [];
  SIDEBAR_NAV.forEach((item) => {
    if (item.toolId) ids.push(item.toolId);
    item.children?.forEach((c) => ids.push(c.toolId));
  });
  return ids;
}
