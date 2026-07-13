/**
 * Export plot DOM / SVG for Figure Studio (visualization only).
 */
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getPlotSvgRoot(container) {
  return container?.querySelector('svg');
}

export function exportPlotSvg(container, filename = 'figure.svg') {
  const svg = getPlotSvgRoot(container);
  if (!svg) throw new Error('No plot SVG found (heatmap exports as PNG/PDF)');
  const clone = svg.cloneNode(true);
  if (!clone.getAttribute('xmlns')) {
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  const xml = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
  downloadBlob(blob, filename);
}

async function rasterizeContainer(container, scale = 2) {
  const svg = getPlotSvgRoot(container);
  if (svg) {
    const xml = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    const w = svg.clientWidth || img.width || 800;
    const h = svg.clientHeight || img.height || 500;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    return { canvas, w, h };
  }

  const target = container?.querySelector('.fs-plot-canvas') || container;
  if (!target) throw new Error('No plot found');
  const canvas = await html2canvas(target, {
    backgroundColor: '#ffffff',
    scale,
    useCORS: true,
  });
  return { canvas, w: canvas.width / scale, h: canvas.height / scale };
}

export async function exportPlotPng(container, { filename = 'figure.png', scale = 2 } = {}) {
  const { canvas } = await rasterizeContainer(container, scale);
  await new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, filename);
      resolve();
    }, 'image/png');
  });
}

export async function exportPlotPdf(container, filename = 'figure.pdf') {
  const { canvas, w, h } = await rasterizeContainer(container, 2);
  const data = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: w > h ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [w, h],
  });
  pdf.addImage(data, 'PNG', 0, 0, w, h);
  pdf.save(filename);
}
