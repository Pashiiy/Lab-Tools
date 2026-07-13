/**
 * True when keyboard input should go to the focused field — not tool shortcuts.
 * Use before preventDefault on Space / arrows / etc.
 */
export function isEditableTarget(target) {
  if (!target || typeof target !== 'object') return false;

  const node = target.nodeType === 3 /* TEXT_NODE */ ? target.parentElement : target;
  if (!node || typeof node.closest !== 'function') {
    if (node?.isContentEditable) return true;
    return false;
  }

  const el = node.closest(
    'input, textarea, select, [contenteditable]:not([contenteditable="false"])'
  );
  if (!el) {
    return Boolean(node.isContentEditable);
  }

  const tag = el.tagName;
  if (tag === 'INPUT') {
    const type = (el.type || 'text').toLowerCase();
    if (
      type === 'button' ||
      type === 'checkbox' ||
      type === 'radio' ||
      type === 'file' ||
      type === 'submit' ||
      type === 'reset' ||
      type === 'image' ||
      type === 'range' ||
      type === 'color' ||
      type === 'hidden'
    ) {
      return false;
    }
    return true;
  }

  return true;
}
