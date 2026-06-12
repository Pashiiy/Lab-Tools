const iconClass = 'shell-dash__icon-svg';

export const TOOL_ICONS = {
  endpoint: () => (
    <svg className={iconClass} viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect x="8" y="28" width="8" height="12" rx="1" fill="currentColor" opacity="0.9" />
      <rect x="20" y="20" width="8" height="20" rx="1" fill="currentColor" opacity="0.7" />
      <rect x="32" y="12" width="8" height="28" rx="1" fill="currentColor" />
      <path d="M6 40h36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
    </svg>
  ),
  colony: () => (
    <svg className={iconClass} viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="17" stroke="currentColor" strokeWidth="2" opacity="0.45" />
      <circle cx="17" cy="20" r="2.5" fill="currentColor" />
      <circle cx="27" cy="18" r="2" fill="currentColor" opacity="0.8" />
      <circle cx="22" cy="28" r="2.2" fill="currentColor" opacity="0.9" />
      <circle cx="31" cy="27" r="1.8" fill="currentColor" opacity="0.65" />
      <circle cx="15" cy="29" r="1.6" fill="currentColor" opacity="0.55" />
    </svg>
  ),
  gel: () => (
    <svg className={iconClass} viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect x="10" y="14" width="28" height="22" rx="2" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <rect x="16" y="20" width="16" height="10" rx="1" stroke="currentColor" strokeWidth="2" />
      <line x1="10" y1="38" x2="38" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
    </svg>
  ),
  qpcr: () => (
    <svg className={iconClass} viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect x="8" y="26" width="6" height="10" rx="1" fill="currentColor" opacity="0.55" />
      <rect x="17" y="18" width="6" height="18" rx="1" fill="currentColor" opacity="0.75" />
      <rect x="26" y="12" width="6" height="24" rx="1" fill="currentColor" />
      <rect x="35" y="22" width="6" height="14" rx="1" fill="currentColor" opacity="0.65" />
      <path d="M6 38h38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
    </svg>
  ),
  figure: () => (
    <svg className={iconClass} viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect x="6" y="8" width="36" height="32" rx="2" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      <path d="M12 32 L20 22 L28 28 L36 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="22" r="2" fill="currentColor" />
      <circle cx="28" cy="28" r="2" fill="currentColor" />
      <circle cx="36" cy="16" r="2" fill="currentColor" />
    </svg>
  ),
};

export function ToolIcon({ name }) {
  const Icon = TOOL_ICONS[name] ?? TOOL_ICONS.endpoint;
  return <Icon />;
}
