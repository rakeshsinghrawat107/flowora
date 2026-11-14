import { useEffect, useState } from 'react';
import {
  exportPdf,
  exportPng,
  exportSvg,
  printDiagram,
  type Orientation,
  type PaperSize,
} from '../lib/exporter';
import type { FloworaRFNode } from '../lib/convert';

export type ExportTab = 'png' | 'svg' | 'pdf' | 'print';

const TABS: { id: ExportTab; label: string }[] = [
  { id: 'png', label: 'PNG image' },
  { id: 'svg', label: 'SVG vector' },
  { id: 'pdf', label: 'PDF document' },
  { id: 'print', label: 'Print' },
];

export default function ExportDialog({
  open,
  initialTab,
  diagramName,
  background,
  getNodes,
  onClose,
}: {
  open: boolean;
  initialTab: ExportTab;
  diagramName: string;
  background: string;
  getNodes: () => FloworaRFNode[];
  onClose: () => void;
}) {
  const [tab, setTab] = useState<ExportTab>(initialTab);
  const [scale, setScale] = useState<1 | 2>(2);
  const [transparent, setTransparent] = useState(false);
  const [paper, setPaper] = useState<PaperSize>('a4');
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setMessage(null);
      setIsError(false);
    }
  }, [open, initialTab]);

  if (!open) return null;

  const run = async () => {
    setBusy(true);
    setMessage(null);
    setIsError(false);
    try {
      if (tab === 'png') {
        await exportPng(getNodes, { scale, transparent, background }, diagramName);
        setMessage('PNG downloaded — no watermark.');
      } else if (tab === 'svg') {
        await exportSvg(getNodes, { scale: 1, transparent, background }, diagramName);
        setMessage('SVG downloaded — no watermark.');
      } else if (tab === 'pdf') {
        await exportPdf(getNodes, { paper, orientation, background }, diagramName);
        setMessage(`PDF downloaded (${paper.toUpperCase()}, ${orientation}, fit to page).`);
      } else {
        await printDiagram(getNodes, { paper, orientation, background });
        setMessage('Print dialog opened — check the preview before printing.');
      }
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : 'Export failed.');
    } finally {
      setBusy(false);
    }
  };

  const actionLabel =
    tab === 'png'
      ? 'Download PNG'
      : tab === 'svg'
        ? 'Download SVG'
        : tab === 'pdf'
          ? 'Download PDF'
          : 'Open print dialog';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Export diagram"
    >
      <div
        className="w-full max-w-md rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-800">Export &amp; print</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="flex gap-1 border-b border-slate-200 px-4 pt-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setMessage(null);
              }}
              className={`rounded-t px-3 py-2 text-sm ${
                tab === t.id
                  ? 'border-b-2 border-blue-600 font-medium text-blue-700'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="space-y-3 px-4 py-4 text-sm text-slate-700">
          {(tab === 'png' || tab === 'svg') && (
            <>
              {tab === 'png' && (
                <label className="flex items-center justify-between gap-2">
                  Resolution
                  <select
                    className="rounded border border-slate-300 px-2 py-1"
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value) as 1 | 2)}
                  >
                    <option value={1}>1× (standard)</option>
                    <option value={2}>2× (retina / crisp print)</option>
                  </select>
                </label>
              )}
              <label className="flex items-center justify-between gap-2">
                Transparent background
                <input
                  type="checkbox"
                  checked={transparent}
                  onChange={(e) => setTransparent(e.target.checked)}
                  className="h-4 w-4"
                />
              </label>
              <p className="text-xs text-slate-400">
                Exports the full diagram cropped to its content. SVG stays infinitely scalable.
              </p>
            </>
          )}
          {(tab === 'pdf' || tab === 'print') && (
            <>
              <label className="flex items-center justify-between gap-2">
                Paper size
                <select
                  className="rounded border border-slate-300 px-2 py-1"
                  value={paper}
                  onChange={(e) => setPaper(e.target.value as PaperSize)}
                >
                  <option value="a4">A4</option>
                  <option value="a3">A3</option>
                </select>
              </label>
              <label className="flex items-center justify-between gap-2">
                Orientation
                <select
                  className="rounded border border-slate-300 px-2 py-1"
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as Orientation)}
                >
                  <option value="landscape">Landscape</option>
                  <option value="portrait">Portrait</option>
                </select>
              </label>
              <p className="text-xs text-slate-400">
                {tab === 'pdf'
                  ? 'The diagram is scaled to fit one page with margins — nothing is clipped.'
                  : 'Opens your browser print dialog with the paper size and orientation above. Use its preview to check the layout.'}
              </p>
            </>
          )}
          {message && (
            <p
              className={`rounded px-2 py-1.5 text-sm ${isError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}
            >
              {message}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => void run()}
            disabled={busy}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? 'Working…' : actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
