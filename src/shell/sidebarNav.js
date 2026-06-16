/**
 * Flat tool list for the sidebar — all modules at one level.
 */
export const SIDEBAR_TOOLS = [
  { id: 'qpcr-analyzer', label: 'qPCR Analysis', icon: 'qpcr' },
  { id: 'gel-quantification', label: 'Gel Analysis', icon: 'gel' },
  { id: 'endpoint-analysis', label: 'Endpoint Analysis', icon: 'endpoint' },
  { id: 'colony-counter', label: 'Colony Counter', icon: 'colony' },
];

export function getAllToolIds() {
  return SIDEBAR_TOOLS.map((t) => t.id);
}
