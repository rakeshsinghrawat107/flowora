import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeTypes,
} from '@xyflow/react';
import type { Diagram, NodeShapeType } from '@flowora/shared';
import FlowNode from './FlowNode';
import Palette, { DRAG_MIME } from './Palette';
import PropertiesPanel from './PropertiesPanel';
import Toolbar from './Toolbar';
import StatusBar from './StatusBar';
import ExportDialog, { type ExportTab } from './ExportDialog';
import RecoveryBanner from './RecoveryBanner';
import ShortcutsPopover from './ShortcutsPopover';
import { useEditorStore } from '../store/editorStore';
import { diagramRepository } from '../lib/db';
import { newId } from '../lib/id';
import { downloadFloworaFile, readFloworaFile } from '../lib/fileIO';
import { SHAPE_MAP } from '../lib/shapes';
import type { FloworaRFEdge, FloworaRFNode } from '../lib/convert';

const nodeTypes: NodeTypes = { flowora: FlowNode };

const defaultEdgeOptions = {
  type: 'bezier' as const,
  markerEnd: { type: MarkerType.ArrowClosed, color: '#334155' },
};

function EditorInner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const rf = useReactFlow<FloworaRFNode, FloworaRFEdge>();
  const canvasRef = useRef<HTMLDivElement>(null);

  const loading = useEditorStore((s) => s.loading);
  const loadError = useEditorStore((s) => s.loadError);
  const loadDiagram = useEditorStore((s) => s.loadDiagram);
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const name = useEditorStore((s) => s.name);
  const setName = useEditorStore((s) => s.setName);
  const viewport = useEditorStore((s) => s.viewport);
  const canvas = useEditorStore((s) => s.canvas);
  const pendingDraft = useEditorStore((s) => s.pendingDraft);
  const saveStatus = useEditorStore((s) => s.saveStatus);

  const [exportOpen, setExportOpen] = useState(false);
  const [exportTab, setExportTab] = useState<ExportTab>('png');
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    if (id) void loadDiagram(id);
  }, [id, loadDiagram]);

  const openExport = useCallback((tab: ExportTab) => {
    setExportTab(tab);
    setExportOpen(true);
  }, []);

  const fitView = useCallback(() => {
    rf.fitView({ padding: 0.2, duration: 200 });
  }, [rf]);

  const addAtCenter = useCallback(
    (shape: NodeShapeType) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      const center = rect
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      useEditorStore.getState().addNode(shape, rf.screenToFlowPosition(center));
    },
    [rf],
  );

  const handleDownloadFile = useCallback(() => {
    const diagram = useEditorStore.getState().buildDiagram();
    if (diagram) downloadFloworaFile(diagram);
  }, []);

  const handleImportFile = useCallback(
    async (file: File) => {
      setImportError(null);
      const result = await readFloworaFile(file);
      if (!result.ok) {
        setImportError(result.error);
        return;
      }
      const now = new Date().toISOString();
      const diagram: Diagram = {
        ...result.diagram,
        id: newId('diagram'),
        metadata: { createdAt: now, updatedAt: now },
      };
      await diagramRepository.putDiagram(diagram);
      navigate(`/d/${diagram.id}`);
    },
    [navigate],
  );

  // Keyboard shortcuts (ignored while typing in a field).
  useEffect(() => {
    const isEditable = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      return (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      );
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExportOpen(false);
        setShortcutsOpen(false);
        return;
      }
      if (isEditable(e.target)) return;
      const store = useEditorStore.getState();
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        store.undo();
      } else if (
        mod &&
        (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))
      ) {
        e.preventDefault();
        store.redo();
      } else if (mod && e.key.toLowerCase() === 'c') {
        store.copySelected();
      } else if (mod && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        store.paste();
      } else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        store.duplicateSelected();
      } else if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        store.selectAll();
      } else if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void store.save();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        store.deleteSelected();
      } else if (e.key === 'f' || e.key === 'F') {
        fitView();
      } else if (e.key === '?') {
        setShortcutsOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fitView]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const shape = e.dataTransfer.getData(DRAG_MIME) as NodeShapeType;
    if (!shape || !(shape in SHAPE_MAP)) return;
    const position = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    useEditorStore.getState().addNode(shape, position);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading diagram…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-50">
        <p className="text-sm text-red-600">{loadError}</p>
        <Link to="/" className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const saveDot =
    saveStatus === 'saving'
      ? 'bg-amber-500'
      : saveStatus === 'saved'
        ? 'bg-green-500'
        : saveStatus === 'draft'
          ? 'bg-amber-500'
          : saveStatus === 'error'
            ? 'bg-red-500'
            : 'bg-slate-300';

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-3 py-2">
        <Link
          to="/"
          className="text-sm font-medium text-slate-500 hover:text-blue-700"
          title="Back to dashboard"
        >
          ← Flowora
        </Link>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Diagram name"
          className="w-64 rounded border border-transparent px-2 py-1 text-base font-semibold text-slate-800 hover:border-slate-300 focus:border-blue-500 focus:outline-none"
        />
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className={`inline-block h-2 w-2 rounded-full ${saveDot}`} />
          {saveStatus === 'saving'
            ? 'Saving…'
            : saveStatus === 'saved'
              ? 'Saved'
              : saveStatus === 'draft'
                ? 'Draft — Ctrl+S to save'
                : saveStatus === 'error'
                  ? 'Save error'
                  : 'Unsaved'}
        </span>
      </header>

      <Toolbar
        onOpenExport={openExport}
        onImportFile={(file) => void handleImportFile(file)}
        onDownloadFile={handleDownloadFile}
        onShowShortcuts={() => setShortcutsOpen(true)}
        onZoomIn={() => rf.zoomIn({ duration: 200 })}
        onZoomOut={() => rf.zoomOut({ duration: 200 })}
        onFitView={fitView}
      />

      {importError && (
        <div
          className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
          role="alert"
        >
          Import failed: {importError}
          <button type="button" onClick={() => setImportError(null)} className="ml-3 underline">
            Dismiss
          </button>
        </div>
      )}

      {pendingDraft && (
        <RecoveryBanner
          draft={pendingDraft}
          onRestore={() => useEditorStore.getState().restoreDraft()}
          onDiscard={() => void useEditorStore.getState().discardDraft()}
        />
      )}

      <div className="flex min-h-0 flex-1">
        <Palette onAddAtCenter={addAtCenter} />
        <div
          ref={canvasRef}
          className="relative min-w-0 flex-1"
          style={{ background: canvas.background }}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <ReactFlow<FloworaRFNode, FloworaRFEdge>
            nodes={nodes}
            edges={edges}
            onNodesChange={useEditorStore.getState().onNodesChange}
            onEdgesChange={useEditorStore.getState().onEdgesChange}
            onConnect={useEditorStore.getState().onConnect}
            onNodeDragStop={useEditorStore.getState().endDrag}
            onMoveEnd={(_, vp) => useEditorStore.getState().setViewport(vp)}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            defaultViewport={viewport}
            connectionMode={ConnectionMode.Loose}
            deleteKeyCode={null}
            selectionOnDrag
            snapToGrid={canvas.snapToGrid}
            snapGrid={[16, 16]}
            minZoom={0.1}
            maxZoom={2}
            fitView={
              nodes.length > 0 && viewport.x === 0 && viewport.y === 0 && viewport.zoom === 1
            }
          >
            {canvas.showGrid && <Background variant={BackgroundVariant.Dots} gap={16} size={1} />}
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable />
          </ReactFlow>
        </div>
        <PropertiesPanel />
      </div>

      <StatusBar />

      <ExportDialog
        open={exportOpen}
        initialTab={exportTab}
        diagramName={name}
        background={canvas.background}
        getNodes={() => rf.getNodes()}
        onClose={() => setExportOpen(false)}
      />
      <ShortcutsPopover open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}

export default function Editor() {
  return (
    <ReactFlowProvider>
      <EditorInner />
    </ReactFlowProvider>
  );
}
