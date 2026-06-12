import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export async function exportPNG(element, fileName, scale = 3) {
  const canvas = await html2canvas(element, {
    backgroundColor: null,
    scale,
    useCORS: true,
    logging: false,
  });
  const link = document.createElement('a');
  link.download = `${fileName}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function exportSVG(element, fileName) {
  const svg = element.querySelector('svg');
  if (!svg) throw new Error('No SVG found in figure');

  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(clone);
  const blob = new Blob(
    [`<?xml version="1.0" standalone="no"?>\n${source}`],
    { type: 'image/svg+xml;charset=utf-8' }
  );
  const link = document.createElement('a');
  link.download = `${fileName}.svg`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function exportPDF(element, fileName, width, height) {
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
    logging: false,
  });
  const imgData = canvas.toDataURL('image/png');
  const pdfW = width / 96;
  const pdfH = height / 96;
  const pdf = new jsPDF({
    orientation: pdfW > pdfH ? 'landscape' : 'portrait',
    unit: 'in',
    format: [pdfW, pdfH],
  });
  pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
  pdf.save(`${fileName}.pdf`);
}
