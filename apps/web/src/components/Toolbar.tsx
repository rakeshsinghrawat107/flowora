import { useRef } from 'react';
import { useCanRedo, useCanUndo, useEditorStore } from '../store/editorStore';

function ToolButton({
  label,
  title,
  onClick,
  disabled = false,
}: {
  label: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden="true" />;
}

export default function Toolbar({
  onOpenExport,
  onImportFile,
  onDownloadFile,
  onShowShortcuts,
  onZoomIn,
  onZoomOut,
  onFitView,
}: {
  onOpenExport: (tab: 'png' | 'svg' | 'pdf' | 'print') => void;
  onImportFile: (file: File) => void;
  onDownloadFile: () => void;
  onShowShortcuts: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const save = useEditorStore((s) => s.save);
  const copySelected = useEditorStore((s) => s.copySelected);
  const paste = useEditorStore((s) => s.paste);
  const duplicateSelected = useEditorStore((s) => s.duplicateSelected);
  const deleteSelected = useEditorStore((s) => s.deleteSelected);
  const selectAll = useEditorStore((s) => s.selectAll);
  const alignSelected = useEditorStore((s) => s.alignSelected);
  const distributeSelected = useEditorStore((s) => s.distributeSelected);
  const hasSelection = useEditorStore(
    (s) => s.nodes.some((n) => n.selected) || s.edges.some((e) => e.selected),
  );
  const multiSelected = useEditorStore((s) => s.nodes.filter((n) => n.selected).length >= 2);
  const threeSelected = useEditorStore((s) => s.nodes.filter((n) => n.selected).length >= 3);

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-white px-2 py-1.5">
      <ToolButton label="↩ Undo" title="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo} />
      <ToolButton label="↪ Redo" title="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={!canRedo} />
      <Divider />
      <ToolButton
        label="⧉ Copy"
        title="Copy selection (Ctrl+C)"
        onClick={copySelected}
        disabled={!hasSelection}
      />
      <ToolButton label="⎘ Paste" title="Paste (Ctrl+V)" onClick={paste} />
      <ToolButton
        label="⧉ Duplicate"
        title="Duplicate selection (Ctrl+D)"
        onClick={duplicateSelected}
        disabled={!hasSelection}
      />
      <ToolButton
        label="⌫ Delete"
        title="Delete selection (Del)"
        onClick={deleteSelected}
        disabled={!hasSelection}
      />
      <ToolButton label="Select all" title="Select all (Ctrl+A)" onClick={selectAll} />
      <Divider />
      <ToolButton
        label="⇤ Left"
        title="Align left"
        onClick={() => alignSelected('left')}
        disabled={!multiSelected}
      />
      <ToolButton
        label="↔ Centre"
        title="Align centre horizontally"
        onClick={() => alignSelected('center')}
        disabled={!multiSelected}
      />
      <ToolButton
        label="⇥ Right"
        title="Align right"
        onClick={() => alignSelected('right')}
        disabled={!multiSelected}
      />
      <ToolButton
        label="⇱ Top"
        title="Align top"
        onClick={() => alignSelected('top')}
        disabled={!multiSelected}
      />
      <ToolButton
        label="⇲ Bottom"
        title="Align bottom"
        onClick={() => alignSelected('bottom')}
        disabled={!multiSelected}
      />
      <ToolButton
        label="⇄ Distribute"
        title="Distribute horizontally (3+ shapes)"
        onClick={() => distributeSelected('horizontal')}
        disabled={!threeSelected}
      />
      <Divider />
      <ToolButton label="− Zoom out" title="Zoom out" onClick={onZoomOut} />
      <ToolButton label="+ Zoom in" title="Zoom in" onClick={onZoomIn} />
      <ToolButton label="⛶ Fit" title="Fit to screen (F)" onClick={onFitView} />
      <Divider />
      <ToolButton label="💾 Save" title="Save diagram (Ctrl+S)" onClick={() => void save()} />
      <ToolButton
        label="⬇ .flowora.json"
        title="Download editable diagram file"
        onClick={onDownloadFile}
      />
      <ToolButton
        label="⬆ Import"
        title="Import a .flowora.json file (opens as a new diagram)"
        onClick={() => fileInputRef.current?.click()}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImportFile(file);
          e.target.value = '';
        }}
      />
      <Divider />
      <ToolButton
        label="🖼 Export"
        title="Export PNG / SVG / PDF"
        onClick={() => onOpenExport('png')}
      />
      <ToolButton
        label="🖨 Print"
        title="Print (A4/A3, portrait/landscape)"
        onClick={() => onOpenExport('print')}
      />
      <Divider />
      <ToolButton label="? Shortcuts" title="Keyboard shortcuts (?)" onClick={onShowShortcuts} />
    </div>
  );
}
