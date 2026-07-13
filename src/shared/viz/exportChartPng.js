import html2canvas from 'html2canvas';

/** Export a DOM node (chart container) as PNG download. */
export async function exportNodeAsPng(node, filename = 'chart.png', { backgroundColor } = {}) {
  if (!node) return false;
  const canvas = await html2canvas(node, {
    backgroundColor: backgroundColor ?? null,
    scale: 2,
    logging: false,
  });
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
  return true;
}
