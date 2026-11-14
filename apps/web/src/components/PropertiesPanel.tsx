import { useEffect, useState, type ReactNode } from 'react';
import { MarkerType } from '@xyflow/react';
import type { FloworaEdgeType, TextAlign } from '@flowora/shared';
import { useEditorStore } from '../store/editorStore';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-slate-100 px-3 py-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-2 text-sm text-slate-600">
      <span className="shrink-0">{label}</span>
      <span className="flex items-center gap-2">{children}</span>
    </label>
  );
}

const inputCls =
  'w-32 rounded border border-slate-300 px-2 py-1 text-sm text-slate-800 focus:border-blue-500 focus:outline-none';
const numberCls =
  'w-20 rounded border border-slate-300 px-2 py-1 text-sm text-slate-800 focus:border-blue-500 focus:outline-none';

/** Text field that commits on blur / Enter (one undo step per edit). */
function CommitInput({
  value,
  onCommit,
  className = inputCls,
  type = 'text',
}: {
  value: string;
  onCommit: (value: string) => void;
  className?: string;
  type?: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <input
      type={type}
      className={className}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== value) onCommit(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        e.stopPropagation();
      }}
    />
  );
}

export default function PropertiesPanel() {
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const canvas = useEditorStore((s) => s.canvas);
  const setCanvas = useEditorStore((s) => s.setCanvas);
  const updateNodeLabel = useEditorStore((s) => s.updateNodeLabel);
  const updateNodeVisual = useEditorStore((s) => s.updateNodeVisual);
  const updateNodeVisualTransient = useEditorStore((s) => s.updateNodeVisualTransient);
  const updateNodeSize = useEditorStore((s) => s.updateNodeSize);
  const updateEdge = useEditorStore((s) => s.updateEdge);
  const updateEdgeTransient = useEditorStore((s) => s.updateEdgeTransient);
  const pushHistorySnapshot = useEditorStore((s) => s.pushHistorySnapshot);
  const deleteSelected = useEditorStore((s) => s.deleteSelected);
  const duplicateSelected = useEditorStore((s) => s.duplicateSelected);

  const selectedNodes = nodes.filter((n) => n.selected);
  const selectedEdges = edges.filter((e) => e.selected);
  const node = selectedNodes.length === 1 ? selectedNodes[0] : undefined;
  const edge = !node && selectedEdges.length === 1 ? selectedEdges[0] : undefined;

  if (node) {
    const visual = node.data.visual;
    const width =
      typeof node.style?.width === 'number' ? node.style.width : (node.measured?.width ?? 180);
    const height =
      typeof node.style?.height === 'number' ? node.style.height : (node.measured?.height ?? 60);
    const aligns: { value: TextAlign; label: string }[] = [
      { value: 'left', label: 'Left' },
      { value: 'center', label: 'Centre' },
      { value: 'right', label: 'Right' },
    ];
    return (
      <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-3 py-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Shape — {node.data.shape}
          </h2>
        </div>
        <Section title="Text">
          <Row label="Label">
            <CommitInput value={node.data.label} onCommit={(v) => updateNodeLabel(node.id, v)} />
          </Row>
          <Row label="Font size">
            <CommitInput
              type="number"
              className={numberCls}
              value={String(visual.fontSize ?? 14)}
              onCommit={(v) => {
                const size = Math.min(72, Math.max(8, Number(v) || 14));
                updateNodeVisual(node.id, { fontSize: size });
              }}
            />
          </Row>
          <Row label="Align">
            <span className="flex gap-1">
              {aligns.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  className={`rounded border px-2 py-1 text-xs ${
                    (visual.textAlign ?? 'center') === a.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-300 text-slate-600'
                  }`}
                  onClick={() => updateNodeVisual(node.id, { textAlign: a.value })}
                >
                  {a.label}
                </button>
              ))}
            </span>
          </Row>
        </Section>
        <Section title="Fill & border">
          <Row label="Fill">
            <input
              type="color"
              value={
                visual.background && visual.background !== 'transparent'
                  ? visual.background
                  : '#ffffff'
              }
              onChange={(e) => updateNodeVisualTransient(node.id, { background: e.target.value })}
              onBlur={pushHistorySnapshot}
              className="h-7 w-12 cursor-pointer rounded border border-slate-300"
            />
          </Row>
          <Row label="Border">
            <input
              type="color"
              value={
                visual.borderColor && visual.borderColor !== 'transparent'
                  ? visual.borderColor
                  : '#334155'
              }
              onChange={(e) => updateNodeVisualTransient(node.id, { borderColor: e.target.value })}
              onBlur={pushHistorySnapshot}
              className="h-7 w-12 cursor-pointer rounded border border-slate-300"
            />
          </Row>
          <Row label="Border width">
            <input
              type="range"
              min={0}
              max={8}
              step={0.5}
              value={visual.borderWidth ?? 1.5}
              onChange={(e) =>
                updateNodeVisualTransient(node.id, { borderWidth: Number(e.target.value) })
              }
              onMouseUp={pushHistorySnapshot}
              onTouchEnd={pushHistorySnapshot}
              className="w-28"
            />
            <span className="w-8 text-right text-xs text-slate-500">
              {visual.borderWidth ?? 1.5}px
            </span>
          </Row>
        </Section>
        <Section title="Size">
          <Row label="Width">
            <CommitInput
              type="number"
              className={numberCls}
              value={String(Math.round(width))}
              onCommit={(v) => updateNodeSize(node.id, Number(v) || width, height)}
            />
          </Row>
          <Row label="Height">
            <CommitInput
              type="number"
              className={numberCls}
              value={String(Math.round(height))}
              onCommit={(v) => updateNodeSize(node.id, width, Number(v) || height)}
            />
          </Row>
        </Section>
        <div className="flex gap-2 px-3 py-3">
          <button
            type="button"
            onClick={duplicateSelected}
            className="flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Duplicate
          </button>
          <button
            type="button"
            onClick={deleteSelected}
            className="flex-1 rounded border border-red-300 px-2 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
        <p className="px-3 pb-3 text-[11px] leading-snug text-slate-400">
          Tip: double-click the shape on the canvas to edit its label in place.
        </p>
      </aside>
    );
  }

  if (edge) {
    const stroke = typeof edge.style?.stroke === 'string' ? edge.style.stroke : '#334155';
    const hasArrow = edge.markerEnd !== undefined;
    const edgeTypes: { value: FloworaEdgeType; label: string }[] = [
      { value: 'bezier', label: 'Curved' },
      { value: 'straight', label: 'Straight' },
      { value: 'smoothstep', label: 'Orthogonal' },
    ];
    return (
      <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-3 py-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Connector
          </h2>
        </div>
        <Section title="Connector">
          <Row label="Label">
            <CommitInput
              value={typeof edge.label === 'string' ? edge.label : ''}
              onCommit={(v) => updateEdge(edge.id, { label: v })}
            />
          </Row>
          <Row label="Type">
            <select
              className={inputCls}
              value={(edge.type as FloworaEdgeType | undefined) ?? 'bezier'}
              onChange={(e) => updateEdge(edge.id, { edgeType: e.target.value as FloworaEdgeType })}
            >
              {edgeTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Colour">
            <input
              type="color"
              value={stroke}
              onChange={(e) => {
                const color = e.target.value;
                updateEdgeTransient(edge.id, {
                  style: { stroke: color, strokeWidth: 1.5 },
                  markerEnd: hasArrow ? { type: MarkerType.ArrowClosed, color } : undefined,
                });
              }}
              onBlur={pushHistorySnapshot}
              className="h-7 w-12 cursor-pointer rounded border border-slate-300"
            />
          </Row>
          <Row label="Arrowhead">
            <input
              type="checkbox"
              checked={hasArrow}
              onChange={(e) =>
                updateEdge(edge.id, {
                  markerEnd: e.target.checked
                    ? { type: MarkerType.ArrowClosed, color: stroke }
                    : undefined,
                })
              }
              className="h-4 w-4"
            />
          </Row>
          <Row label="Animated">
            <input
              type="checkbox"
              checked={edge.animated ?? false}
              onChange={(e) => updateEdge(edge.id, { animated: e.target.checked })}
              className="h-4 w-4"
            />
          </Row>
        </Section>
        <div className="flex gap-2 px-3 py-3">
          <button
            type="button"
            onClick={deleteSelected}
            className="flex-1 rounded border border-red-300 px-2 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            Delete connector
          </button>
        </div>
      </aside>
    );
  }

  if (selectedNodes.length > 1 || selectedEdges.length > 1) {
    return (
      <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-3 py-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Selection
          </h2>
        </div>
        <p className="px-3 py-3 text-sm text-slate-600">
          {selectedNodes.length} shape{selectedNodes.length === 1 ? '' : 's'} and{' '}
          {selectedEdges.length} connector{selectedEdges.length === 1 ? '' : 's'} selected.
        </p>
        <div className="flex gap-2 px-3 pb-3">
          <button
            type="button"
            onClick={duplicateSelected}
            className="flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Duplicate
          </button>
          <button
            type="button"
            onClick={deleteSelected}
            className="flex-1 rounded border border-red-300 px-2 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Canvas</h2>
      </div>
      <Section title="Canvas">
        <Row label="Background">
          <input
            type="color"
            value={canvas.background}
            onChange={(e) => setCanvas({ background: e.target.value })}
            className="h-7 w-12 cursor-pointer rounded border border-slate-300"
          />
        </Row>
        <Row label="Show grid">
          <input
            type="checkbox"
            checked={canvas.showGrid}
            onChange={(e) => setCanvas({ showGrid: e.target.checked })}
            className="h-4 w-4"
          />
        </Row>
        <Row label="Snap to grid">
          <input
            type="checkbox"
            checked={canvas.snapToGrid}
            onChange={(e) => setCanvas({ snapToGrid: e.target.checked })}
            className="h-4 w-4"
          />
        </Row>
      </Section>
      <p className="px-3 py-3 text-[11px] leading-snug text-slate-400">
        Select a shape or connector to edit its properties. Drag shapes from the left palette, then
        drag from a handle dot to connect two shapes.
      </p>
    </aside>
  );
}
