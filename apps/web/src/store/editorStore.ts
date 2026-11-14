import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  MarkerType,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';
import { create } from 'zustand';
import type {
  Diagram,
  DiagramType,
  FloworaEdgeType,
  NodeShapeType,
  NodeStyle,
  Viewport,
} from '@flowora/shared';
import { diagramRepository } from '../lib/db';
import {
  floworaToRF,
  rfEdgeToFlowora,
  rfNodeToFlowora,
  type FloworaRFEdge,
  type FloworaRFNode,
} from '../lib/convert';
import {
  canRedo,
  canUndo,
  createHistory,
  pushHistory,
  redoHistory,
  undoHistory,
  type HistoryState,
} from '../lib/history';
import { newId } from '../lib/id';
import { SHAPE_MAP } from '../lib/shapes';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'draft' | 'error';

export interface CanvasSettings {
  background: string;
  showGrid: boolean;
  snapToGrid: boolean;
}

export interface Snapshot {
  nodes: FloworaRFNode[];
  edges: FloworaRFEdge[];
}

interface ClipboardData {
  nodes: FloworaRFNode[];
  edges: FloworaRFEdge[];
}

export type AlignDirection = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

interface EditorState {
  diagramId: string | null;
  name: string;
  diagramType: DiagramType;
  createdAt: string;
  nodes: FloworaRFNode[];
  edges: FloworaRFEdge[];
  history: HistoryState<Snapshot>;
  clipboard: ClipboardData | null;
  viewport: Viewport;
  canvas: CanvasSettings;
  saveStatus: SaveStatus;
  savedAt: string | null;
  draftAt: string | null;
  saveError: string | null;
  /** Draft newer than the committed version, awaiting a Restore/Discard choice. */
  pendingDraft: Diagram | null;
  loading: boolean;
  loadError: string | null;

  loadDiagram: (id: string) => Promise<void>;
  restoreDraft: () => void;
  discardDraft: () => Promise<void>;
  setName: (name: string) => void;

  onNodesChange: (changes: NodeChange<FloworaRFNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<FloworaRFEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  endDrag: () => void;

  addNode: (shape: NodeShapeType, position: { x: number; y: number }) => void;
  updateNodeLabel: (id: string, label: string) => void;
  updateNodeVisual: (id: string, patch: Partial<NodeStyle>) => void;
  /** Live preview update without a history entry (color pickers, sliders). */
  updateNodeVisualTransient: (id: string, patch: Partial<NodeStyle>) => void;
  updateNodeSize: (id: string, width: number, height: number) => void;
  updateEdge: (id: string, patch: Partial<FloworaRFEdge> & { edgeType?: FloworaEdgeType }) => void;
  updateEdgeTransient: (id: string, patch: Partial<FloworaRFEdge>) => void;
  /** Push the current state as one undo step (call after transient edits end). */
  pushHistorySnapshot: () => void;

  deleteSelected: () => void;
  copySelected: () => void;
  paste: () => void;
  duplicateSelected: () => void;
  selectAll: () => void;
  alignSelected: (direction: AlignDirection) => void;
  distributeSelected: (direction: 'horizontal' | 'vertical') => void;

  undo: () => void;
  redo: () => void;

  setCanvas: (patch: Partial<CanvasSettings>) => void;
  setViewport: (viewport: Viewport) => void;

  save: () => Promise<void>;
  buildDiagram: () => Diagram | null;
}

const AUTOSAVE_DELAY_MS = 1000;
const PASTE_OFFSET = 24;

const snapshotOf = (nodes: FloworaRFNode[], edges: FloworaRFEdge[]): Snapshot => ({
  nodes: structuredClone(nodes),
  edges: structuredClone(edges),
});

let autosaveTimer: ReturnType<typeof setTimeout> | null = null;

export const useEditorStore = create<EditorState>()((set, get) => {
  /** Commit a new nodes/edges state: push history, mark dirty, schedule autosave. */
  const commit = (nodes: FloworaRFNode[], edges: FloworaRFEdge[]) => {
    const { history } = get();
    set({
      nodes,
      edges,
      history: pushHistory(history, snapshotOf(nodes, edges)),
      saveStatus: 'saving',
      saveError: null,
    });
    scheduleAutosave();
  };

  const scheduleAutosave = () => {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      void writeDraft();
    }, AUTOSAVE_DELAY_MS);
  };

  /** Autosave writes to the drafts store only — never to the committed diagram. */
  const writeDraft = async () => {
    const diagram = get().buildDiagram();
    if (!diagram) return;
    try {
      const now = new Date().toISOString();
      await diagramRepository.putDraft({
        diagramId: diagram.id,
        content: { ...diagram, metadata: { ...diagram.metadata, updatedAt: now } },
        updatedAt: now,
      });
      set({ saveStatus: 'draft', draftAt: now });
    } catch (error) {
      set({
        saveStatus: 'error',
        saveError: error instanceof Error ? error.message : 'Autosave failed',
      });
    }
  };

  const selectedNodes = () => get().nodes.filter((n) => n.selected);
  const selectedEdges = () => get().edges.filter((e) => e.selected);

  return {
    diagramId: null,
    name: '',
    diagramType: 'blank',
    createdAt: new Date().toISOString(),
    nodes: [],
    edges: [],
    history: createHistory<Snapshot>({ nodes: [], edges: [] }),
    clipboard: null,
    viewport: { x: 0, y: 0, zoom: 1 },
    canvas: { background: '#ffffff', showGrid: true, snapToGrid: true },
    saveStatus: 'idle',
    savedAt: null,
    draftAt: null,
    saveError: null,
    pendingDraft: null,
    loading: true,
    loadError: null,

    loadDiagram: async (id: string) => {
      // A pending autosave for the previous diagram must not fire after the
      // new diagram's state is in place.
      if (autosaveTimer) {
        clearTimeout(autosaveTimer);
        autosaveTimer = null;
      }
      set({ loading: true, loadError: null, pendingDraft: null });
      try {
        const diagram = await diagramRepository.getDiagram(id);
        if (!diagram) {
          set({ loading: false, loadError: `Diagram not found.` });
          return;
        }
        const { nodes, edges } = floworaToRF(diagram);
        const draft = await diagramRepository.getDraft(id);
        const draftIsNewer =
          draft !== undefined &&
          Date.parse(draft.updatedAt) > Date.parse(diagram.metadata.updatedAt);
        set({
          diagramId: diagram.id,
          name: diagram.name,
          diagramType: diagram.type,
          createdAt: diagram.metadata.createdAt,
          nodes,
          edges,
          history: createHistory<Snapshot>(snapshotOf(nodes, edges)),
          viewport: diagram.viewport,
          canvas: {
            background: diagram.canvas?.background ?? '#ffffff',
            showGrid: diagram.canvas?.showGrid ?? true,
            snapToGrid: diagram.canvas?.snapToGrid ?? true,
          },
          saveStatus: 'saved',
          savedAt: diagram.metadata.updatedAt,
          draftAt: draftIsNewer ? draft.updatedAt : null,
          pendingDraft: draftIsNewer ? draft.content : null,
          loading: false,
        });
      } catch (error) {
        set({
          loading: false,
          loadError: error instanceof Error ? error.message : 'Failed to load diagram',
        });
      }
    },

    restoreDraft: () => {
      const { pendingDraft } = get();
      if (!pendingDraft) return;
      const { nodes, edges } = floworaToRF(pendingDraft);
      set({
        nodes,
        edges,
        history: createHistory<Snapshot>(snapshotOf(nodes, edges)),
        name: pendingDraft.name,
        viewport: pendingDraft.viewport,
        canvas: {
          background: pendingDraft.canvas?.background ?? '#ffffff',
          showGrid: pendingDraft.canvas?.showGrid ?? true,
          snapToGrid: pendingDraft.canvas?.snapToGrid ?? true,
        },
        pendingDraft: null,
        saveStatus: 'draft',
        draftAt: pendingDraft.metadata.updatedAt,
      });
    },

    discardDraft: async () => {
      const { diagramId } = get();
      if (diagramId) await diagramRepository.deleteDraft(diagramId);
      set({ pendingDraft: null, draftAt: null });
    },

    setName: (name: string) => {
      set({ name, saveStatus: 'saving' });
      scheduleAutosave();
    },

    onNodesChange: (changes) => {
      const next = applyNodeChanges(changes, get().nodes);
      // Selection-only changes don't touch history or autosave.
      const contentChange = changes.some((c) => c.type !== 'select');
      if (!contentChange) {
        set({ nodes: next });
        return;
      }
      // Position changes during a drag are applied live; history is pushed
      // once on drag end (see beginDrag/endDrag).
      const dragging = changes.some((c) => c.type === 'position' && c.dragging === true);
      if (dragging) {
        set({ nodes: next });
        return;
      }
      set({ nodes: next });
    },

    onEdgesChange: (changes) => {
      const next = applyEdgeChanges(changes, get().edges);
      const contentChange = changes.some((c) => c.type !== 'select');
      set({ edges: next });
      if (contentChange) scheduleAutosave();
    },

    onConnect: (connection) => {
      const { nodes, edges } = get();
      const next = addEdge(
        {
          ...connection,
          id: newId('edge'),
          type: 'bezier',
          animated: false,
        },
        edges,
      );
      commit(nodes, next);
    },

    endDrag: () => {
      // history.present is the pre-drag snapshot: drag position changes are
      // applied live without committing, so compare against it now.
      const { nodes, edges, history } = get();
      const before = history.present;
      const moved =
        JSON.stringify(before.nodes.map((n) => [n.id, n.position])) !==
        JSON.stringify(nodes.map((n) => [n.id, n.position]));
      if (moved) {
        set({
          history: pushHistory(history, snapshotOf(nodes, edges)),
          saveStatus: 'saving',
        });
        scheduleAutosave();
      }
    },

    addNode: (shape, position) => {
      const def = SHAPE_MAP[shape];
      const node: FloworaRFNode = {
        id: newId('node'),
        type: 'flowora',
        position: { x: position.x - def.defaultWidth / 2, y: position.y - def.defaultHeight / 2 },
        data: {
          shape,
          label: def.label,
          visual: { ...def.defaultStyle },
        },
        style: { width: def.defaultWidth, height: def.defaultHeight },
        selected: true,
      };
      const { nodes, edges } = get();
      const deselected = nodes.map((n) => ({ ...n, selected: false }));
      commit([...deselected, node], edges);
    },

    updateNodeLabel: (id, label) => {
      const { nodes, edges } = get();
      commit(
        nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, label } } : n)),
        edges,
      );
    },

    updateNodeVisual: (id, patch) => {
      const { nodes, edges } = get();
      commit(
        nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, visual: { ...n.data.visual, ...patch } } } : n,
        ),
        edges,
      );
    },

    updateNodeVisualTransient: (id, patch) => {
      const { nodes } = get();
      set({
        nodes: nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, visual: { ...n.data.visual, ...patch } } } : n,
        ),
        saveStatus: 'saving',
      });
      scheduleAutosave();
    },

    updateNodeSize: (id, width, height) => {
      const { nodes, edges } = get();
      const w = Math.max(40, Math.round(width));
      const h = Math.max(24, Math.round(height));
      commit(
        nodes.map((n) => (n.id === id ? { ...n, style: { ...n.style, width: w, height: h } } : n)),
        edges,
      );
    },

    updateEdge: (id, patch) => {
      const { nodes, edges } = get();
      const { edgeType, ...rest } = patch;
      commit(
        nodes,
        edges.map((e) => {
          if (e.id !== id) return e;
          const next: FloworaRFEdge = { ...e, ...rest };
          if (edgeType !== undefined) next.type = edgeType;
          if (rest.style?.stroke) {
            const color = rest.style.stroke as string;
            if (typeof next.markerEnd === 'object') {
              next.markerEnd = { ...next.markerEnd, color };
            } else if (typeof next.markerEnd === 'string') {
              next.markerEnd = { type: MarkerType.ArrowClosed, color };
            }
          }
          return next;
        }),
      );
    },

    updateEdgeTransient: (id, patch) => {
      const { edges } = get();
      set({
        edges: edges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        saveStatus: 'saving',
      });
      scheduleAutosave();
    },

    pushHistorySnapshot: () => {
      const { history, nodes, edges } = get();
      const current = snapshotOf(nodes, edges);
      if (JSON.stringify(current) === JSON.stringify(history.present)) return;
      set({ history: pushHistory(history, current) });
    },

    deleteSelected: () => {
      const { nodes, edges } = get();
      const nodeIds = new Set(selectedNodes().map((n) => n.id));
      const edgeIds = new Set(selectedEdges().map((e) => e.id));
      if (nodeIds.size === 0 && edgeIds.size === 0) return;
      commit(
        nodes.filter((n) => !nodeIds.has(n.id)),
        edges.filter((e) => !edgeIds.has(e.id) && !nodeIds.has(e.source) && !nodeIds.has(e.target)),
      );
    },

    copySelected: () => {
      const nodes = selectedNodes();
      if (nodes.length === 0) return;
      const ids = new Set(nodes.map((n) => n.id));
      const edges = get().edges.filter((e) => ids.has(e.source) && ids.has(e.target));
      set({ clipboard: { nodes: structuredClone(nodes), edges: structuredClone(edges) } });
    },

    paste: () => {
      const { clipboard, nodes, edges } = get();
      if (!clipboard) return;
      const idMap = new Map<string, string>();
      const pastedNodes = clipboard.nodes.map((n) => {
        const id = newId('node');
        idMap.set(n.id, id);
        return {
          ...structuredClone(n),
          id,
          position: { x: n.position.x + PASTE_OFFSET, y: n.position.y + PASTE_OFFSET },
          selected: true,
        };
      });
      const pastedEdges = clipboard.edges.map((e) => ({
        ...structuredClone(e),
        id: newId('edge'),
        source: idMap.get(e.source) ?? e.source,
        target: idMap.get(e.target) ?? e.target,
        selected: false,
      }));
      const deselected = nodes.map((n) => ({ ...n, selected: false }));
      commit([...deselected, ...pastedNodes], [...edges, ...pastedEdges]);
    },

    duplicateSelected: () => {
      get().copySelected();
      get().paste();
    },

    selectAll: () => {
      set({
        nodes: get().nodes.map((n) => ({ ...n, selected: true })),
        edges: get().edges.map((e) => ({ ...e, selected: true })),
      });
    },

    alignSelected: (direction) => {
      const selected = selectedNodes();
      if (selected.length < 2) return;
      const { nodes, edges } = get();
      const boxes = selected.map((n) => {
        const w = typeof n.style?.width === 'number' ? n.style.width : (n.measured?.width ?? 180);
        const h = typeof n.style?.height === 'number' ? n.style.height : (n.measured?.height ?? 60);
        return { id: n.id, x: n.position.x, y: n.position.y, w, h };
      });
      const minX = Math.min(...boxes.map((b) => b.x));
      const maxRight = Math.max(...boxes.map((b) => b.x + b.w));
      const centerX = (minX + maxRight) / 2;
      const minY = Math.min(...boxes.map((b) => b.y));
      const maxBottom = Math.max(...boxes.map((b) => b.y + b.h));
      const centerY = (minY + maxBottom) / 2;
      const next = nodes.map((n) => {
        const box = boxes.find((b) => b.id === n.id);
        if (!box) return n;
        switch (direction) {
          case 'left':
            return { ...n, position: { ...n.position, x: minX } };
          case 'right':
            return { ...n, position: { ...n.position, x: maxRight - box.w } };
          case 'center':
            return { ...n, position: { ...n.position, x: centerX - box.w / 2 } };
          case 'top':
            return { ...n, position: { ...n.position, y: minY } };
          case 'bottom':
            return { ...n, position: { ...n.position, y: maxBottom - box.h } };
          case 'middle':
            return { ...n, position: { ...n.position, y: centerY - box.h / 2 } };
        }
      });
      commit(next, edges);
    },

    distributeSelected: (direction) => {
      const selected = selectedNodes();
      if (selected.length < 3) return;
      const { nodes, edges } = get();
      const boxes = selected
        .map((n) => {
          const w = typeof n.style?.width === 'number' ? n.style.width : (n.measured?.width ?? 180);
          const h =
            typeof n.style?.height === 'number' ? n.style.height : (n.measured?.height ?? 60);
          return { id: n.id, x: n.position.x, y: n.position.y, w, h };
        })
        .sort((a, b) => (direction === 'horizontal' ? a.x - b.x : a.y - b.y));
      const first = boxes[0];
      const last = boxes[boxes.length - 1];
      if (!first || !last) return;
      const totalSpan =
        direction === 'horizontal' ? last.x + last.w - first.x : last.y + last.h - first.y;
      const totalSize = boxes.reduce((sum, b) => sum + (direction === 'horizontal' ? b.w : b.h), 0);
      const gap = (totalSpan - totalSize) / (boxes.length - 1);
      let cursor = direction === 'horizontal' ? first.x : first.y;
      const positions = new Map<string, { x: number; y: number }>();
      for (const box of boxes) {
        if (direction === 'horizontal') {
          positions.set(box.id, { x: cursor, y: box.y });
          cursor += box.w + gap;
        } else {
          positions.set(box.id, { x: box.x, y: cursor });
          cursor += box.h + gap;
        }
      }
      const next = nodes.map((n) => {
        const pos = positions.get(n.id);
        return pos ? { ...n, position: pos } : n;
      });
      commit(next, edges);
    },

    undo: () => {
      const { history } = get();
      if (!canUndo(history)) return;
      const next = undoHistory(history);
      set({ history: next, nodes: next.present.nodes, edges: next.present.edges });
      scheduleAutosave();
    },

    redo: () => {
      const { history } = get();
      if (!canRedo(history)) return;
      const next = redoHistory(history);
      set({ history: next, nodes: next.present.nodes, edges: next.present.edges });
      scheduleAutosave();
    },

    setCanvas: (patch) => {
      set({ canvas: { ...get().canvas, ...patch }, saveStatus: 'saving' });
      scheduleAutosave();
    },

    setViewport: (viewport) => {
      set({ viewport });
    },

    save: async () => {
      const diagram = get().buildDiagram();
      if (!diagram) return;
      set({ saveStatus: 'saving', saveError: null });
      try {
        const now = new Date().toISOString();
        const saved: Diagram = {
          ...diagram,
          metadata: { ...diagram.metadata, updatedAt: now },
        };
        await diagramRepository.putDiagram(saved);
        await diagramRepository.deleteDraft(saved.id);
        set({ saveStatus: 'saved', savedAt: now, draftAt: null });
      } catch (error) {
        set({
          saveStatus: 'error',
          saveError: error instanceof Error ? error.message : 'Save failed',
        });
      }
    },

    buildDiagram: () => {
      const s = get();
      if (!s.diagramId) return null;
      return {
        id: s.diagramId,
        name: s.name,
        type: s.diagramType,
        version: 1,
        viewport: s.viewport,
        nodes: s.nodes.map(rfNodeToFlowora),
        edges: s.edges.map(rfEdgeToFlowora),
        metadata: { createdAt: s.createdAt, updatedAt: new Date().toISOString() },
        canvas: { ...s.canvas },
      };
    },
  };
});

export const useCanUndo = () => useEditorStore((s) => canUndo(s.history));
export const useCanRedo = () => useEditorStore((s) => canRedo(s.history));
