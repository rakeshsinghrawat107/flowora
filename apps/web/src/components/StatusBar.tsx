import { useEditorStore } from '../store/editorStore';
import { formatTime } from '../lib/id';

export default function StatusBar() {
  const zoom = useEditorStore((s) => s.viewport.zoom);
  const nodeCount = useEditorStore((s) => s.nodes.length);
  const edgeCount = useEditorStore((s) => s.edges.length);
  const selectedCount = useEditorStore((s) => s.nodes.filter((n) => n.selected).length);
  const canvas = useEditorStore((s) => s.canvas);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const savedAt = useEditorStore((s) => s.savedAt);
  const draftAt = useEditorStore((s) => s.draftAt);
  const saveError = useEditorStore((s) => s.saveError);
  const diagramType = useEditorStore((s) => s.diagramType);

  const saveText =
    saveStatus === 'saving'
      ? 'Saving…'
      : saveStatus === 'saved' && savedAt
        ? `Saved ${formatTime(savedAt)}`
        : saveStatus === 'draft' && draftAt
          ? `Draft saved ${formatTime(draftAt)} — press Ctrl+S to save`
          : saveStatus === 'error'
            ? `Save error: ${saveError ?? 'unknown'}`
            : 'Unsaved';

  return (
    <footer className="flex items-center gap-4 border-t border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500">
      <span>{Math.round(zoom * 100)}%</span>
      <span>
        {nodeCount} shape{nodeCount === 1 ? '' : 's'} · {edgeCount} connector
        {edgeCount === 1 ? '' : 's'}
      </span>
      {selectedCount > 0 && <span>{selectedCount} selected</span>}
      <span>{diagramType === 'blank' ? 'Blank diagram' : `${diagramType} diagram`}</span>
      <span>Grid {canvas.showGrid ? 'on' : 'off'}</span>
      <span>Snap {canvas.snapToGrid ? 'on' : 'off'}</span>
      <span
        className={`ml-auto font-medium ${
          saveStatus === 'error'
            ? 'text-red-600'
            : saveStatus === 'draft'
              ? 'text-amber-600'
              : 'text-slate-600'
        }`}
      >
        {saveText}
      </span>
    </footer>
  );
}
