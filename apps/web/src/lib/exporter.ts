import { getNodesBounds } from '@xyflow/react';
import type { FloworaRFNode } from './convert';
import { downloadTextFile, downloadUrl, slugifyName } from './fileIO';

// html-to-image and jspdf are imported dynamically inside the export
// functions so the heavy export libraries load on demand, not at startup.

export type PaperSize = 'a4' | 'a3';
export type Orientation = 'portrait' | 'landscape';

export interface ImageExportOptions {
  /** 1 = standard, 2 = retina. */
  scale: 1 | 2;
  transparent: boolean;
  background: string;
}

export interface PdfExportOptions {
  paper: PaperSize;
  orientation: Orientation;
  background: string;
}

type GetNodes = () => FloworaRFNode[];

function getViewportElement(): HTMLElement {
  const el = document.querySelector('.react-flow__viewport');
  if (!(el instanceof HTMLElement)) {
    throw new Error('Canvas is not ready yet — try again in a moment.');
  }
  return el;
}

interface Capture {
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Capture the diagram as a PNG data URL, cropped to the nodes' bounding box.
 * Handles and selection rings are hidden during capture via the `.exporting`
 * class (see index.css). No watermark is ever added.
 */
async function capturePng(getNodes: GetNodes, options: ImageExportOptions): Promise<Capture> {
  const nodes = getNodes();
  if (nodes.length === 0) {
    throw new Error('Nothing to export yet — add a shape first.');
  }
  const bounds = getNodesBounds(nodes);
  const pad = 24;
  const width = Math.ceil(bounds.width + pad * 2);
  const height = Math.ceil(bounds.height + pad * 2);
  const viewport = getViewportElement();
  viewport.classList.add('exporting');
  try {
    const { toPng } = await import('html-to-image');
    const dataUrl = await toPng(viewport, {
      backgroundColor: options.transparent ? undefined : options.background,
      pixelRatio: options.scale,
      width,
      height,
      style: {
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(${-(bounds.x - pad)}px, ${-(bounds.y - pad)}px)`,
      },
    });
    return { dataUrl, width, height };
  } finally {
    viewport.classList.remove('exporting');
  }
}

export async function exportPng(
  getNodes: GetNodes,
  options: ImageExportOptions,
  diagramName: string,
): Promise<void> {
  const { dataUrl } = await capturePng(getNodes, options);
  downloadUrl(dataUrl, `${slugifyName(diagramName)}.png`);
}

export async function exportSvg(
  getNodes: GetNodes,
  options: ImageExportOptions,
  diagramName: string,
): Promise<void> {
  const nodes = getNodes();
  if (nodes.length === 0) {
    throw new Error('Nothing to export yet — add a shape first.');
  }
  const bounds = getNodesBounds(nodes);
  const pad = 24;
  const width = Math.ceil(bounds.width + pad * 2);
  const height = Math.ceil(bounds.height + pad * 2);
  const viewport = getViewportElement();
  viewport.classList.add('exporting');
  try {
    const { toSvg } = await import('html-to-image');
    const dataUrl = await toSvg(viewport, {
      backgroundColor: options.transparent ? undefined : options.background,
      width,
      height,
      style: {
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(${-(bounds.x - pad)}px, ${-(bounds.y - pad)}px)`,
      },
    });
    const svgText = decodeURIComponent(dataUrl.replace(/^data:image\/svg\+xml;charset=utf-8,/, ''));
    downloadTextFile(`${slugifyName(diagramName)}.svg`, svgText, 'image/svg+xml');
  } finally {
    viewport.classList.remove('exporting');
  }
}

const PAPER_MM: Record<PaperSize, { w: number; h: number }> = {
  a4: { w: 210, h: 297 },
  a3: { w: 297, h: 420 },
};

export async function exportPdf(
  getNodes: GetNodes,
  options: PdfExportOptions,
  diagramName: string,
): Promise<void> {
  const { dataUrl, width, height } = await capturePng(getNodes, {
    scale: 2,
    transparent: false,
    background: options.background,
  });
  const paper = PAPER_MM[options.paper];
  const pageW = options.orientation === 'portrait' ? paper.w : paper.h;
  const pageH = options.orientation === 'portrait' ? paper.h : paper.w;
  const margin = 10;
  const maxW = pageW - margin * 2;
  const maxH = pageH - margin * 2;
  const scale = Math.min(maxW / width, maxH / height);
  const imgW = width * scale;
  const imgH = height * scale;
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({
    orientation: options.orientation,
    unit: 'mm',
    format: options.paper,
  });
  pdf.addImage(dataUrl, 'PNG', (pageW - imgW) / 2, (pageH - imgH) / 2, imgW, imgH);
  pdf.save(`${slugifyName(diagramName)}.pdf`);
}

/**
 * Print via the browser print dialog. The diagram image is placed in the
 * dedicated #print-area element (visible only in print media) and an @page
 * rule sets the requested paper size + orientation.
 */
export async function printDiagram(getNodes: GetNodes, options: PdfExportOptions): Promise<void> {
  const { dataUrl } = await capturePng(getNodes, {
    scale: 2,
    transparent: false,
    background: options.background,
  });
  const printArea = document.getElementById('print-area');
  if (!printArea) throw new Error('Print area is missing from the page.');
  printArea.innerHTML = '';
  const img = document.createElement('img');
  img.src = dataUrl;
  img.alt = 'Diagram printout';
  printArea.appendChild(img);

  const pageSize = options.paper.toUpperCase();
  let styleEl = document.getElementById('print-page-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'print-page-style';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = `@page { size: ${pageSize} ${options.orientation}; margin: 10mm; }`;

  const cleanup = () => {
    printArea.innerHTML = '';
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
  // Fallback cleanup in case afterprint never fires (e.g. dialog cancelled
  // in some browsers): clear after a delay, keeping the image long enough
  // for the print dialog to snapshot it.
  window.setTimeout(() => {
    if (printArea.innerHTML !== '') cleanup();
  }, 60_000);
}
