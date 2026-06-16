/**
 * Consistent save / export / import action row for tool-specific data.
 * Workspace-level project actions live in the shell top bar; this bar is for
 * tool output (Excel, CSV, images, etc.) in the same location in every tool.
 */
export default function ToolActionBar({ children, hint, ...rest }) {
  if (!children) return null;
  return (
    <div className="lt-action-bar" {...rest}>
      {hint && <span className="lt-action-bar__hint">{hint}</span>}
      <div className="lt-action-bar__actions">{children}</div>
    </div>
  );
}
