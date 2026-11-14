import { useState, type CSSProperties } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NodeShapeType, NodeStyle } from '@flowora/shared';
import type { FloworaRFNode } from '../lib/convert';
import { useEditorStore } from '../store/editorStore';

const HANDLE_POSITIONS: { id: string; position: Position; style: CSSProperties }[] = [
  { id: 'top', position: Position.Top, style: { top: -5, left: '50%' } },
  { id: 'right', position: Position.Right, style: { top: '50%', right: -5 } },
  { id: 'bottom', position: Position.Bottom, style: { bottom: -5, left: '50%' } },
  { id: 'left', position: Position.Left, style: { top: '50%', left: -5 } },
];

const DIAMOND_CLIP = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
const IO_CLIP = 'polygon(18% 0%, 100% 0%, 82% 100%, 0% 100%)';
const DOCUMENT_CLIP = 'polygon(0% 0%, 100% 0%, 100% 82%, 75% 100%, 50% 82%, 25% 100%, 0% 82%)';

/** A clipped shape drawn as two layers (border color behind, fill in front). */
function ClippedShape({
  clipPath,
  visual,
  borderWidth,
}: {
  clipPath: string;
  visual: NodeStyle;
  borderWidth: number;
}) {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{ clipPath, background: visual.borderColor ?? '#334155' }}
      />
      <div
        className="absolute"
        style={{
          clipPath,
          background: visual.background ?? '#ffffff',
          inset: `${borderWidth}px`,
        }}
      />
    </>
  );
}

function PersonGlyph({ color }: { color: string }) {
  return (
    <svg width="34" height="40" viewBox="0 0 34 40" fill="none" aria-hidden="true">
      <circle cx="17" cy="7" r="5.5" stroke={color} strokeWidth="2" />
      <path
        d="M6 38 C6 26 12 20 17 20 C22 20 28 26 28 38"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ActorGlyph({ color }: { color: string }) {
  return (
    <svg width="30" height="56" viewBox="0 0 30 56" fill="none" aria-hidden="true">
      <circle cx="15" cy="6" r="4.5" stroke={color} strokeWidth="2" />
      <line x1="15" y1="11" x2="15" y2="32" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="4" y1="18" x2="26" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="15" y1="32" x2="6" y2="52" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="15" y1="32" x2="24" y2="52" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LabelEditor({
  initial,
  fontSize,
  onCommit,
  onCancel,
}: {
  initial: string;
  fontSize: number;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <input
      className="nodrag nopan w-full bg-white px-1 py-0.5 text-center outline outline-2 outline-blue-500"
      style={{ fontSize }}
      value={value}
      autoFocus
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onCommit(value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onCommit(value);
        if (e.key === 'Escape') onCancel();
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    />
  );
}

function isClippedShape(shape: NodeShapeType): string | null {
  if (shape === 'diamond' || shape === 'decision' || shape === 'relationship') return DIAMOND_CLIP;
  if (shape === 'io') return IO_CLIP;
  if (shape === 'document') return DOCUMENT_CLIP;
  return null;
}

function borderRadiusFor(shape: NodeShapeType): string {
  switch (shape) {
    case 'rounded':
    case 'api':
      return '10px';
    case 'ellipse':
    case 'attribute':
    case 'usecase':
    case 'terminator':
      return '9999px';
    case 'database':
      return '50% / 12%';
    default:
      return '4px';
  }
}

export default function FlowNode({ id, data, selected }: NodeProps<FloworaRFNode>) {
  const updateNodeLabel = useEditorStore((s) => s.updateNodeLabel);
  const [editing, setEditing] = useState(false);
  const { shape, label, visual } = data;
  const borderWidth = visual.borderWidth ?? 1.5;
  const fontSize = visual.fontSize ?? 14;
  const color = visual.color ?? '#0f172a';
  const clipPath = isClippedShape(shape);
  const isFigure = shape === 'user' || shape === 'actor';

  const commitLabel = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length > 0 && trimmed !== label) updateNodeLabel(id, trimmed);
    setEditing(false);
  };

  const labelBlock = editing ? (
    <LabelEditor
      initial={label}
      fontSize={fontSize}
      onCommit={commitLabel}
      onCancel={() => setEditing(false)}
    />
  ) : (
    <div
      className="pointer-events-none w-full break-words px-2 leading-snug"
      style={{
        fontSize,
        color,
        textAlign: visual.textAlign ?? 'center',
        fontWeight: shape === 'class' || shape === 'entity' ? 600 : 500,
      }}
    >
      {label}
    </div>
  );

  return (
    <div
      className={`relative h-full w-full ${selected ? 'flowora-node-selected' : ''}`}
      style={
        selected
          ? { boxShadow: '0 0 0 2px #2563eb', borderRadius: borderRadiusFor(shape) }
          : undefined
      }
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      title="Double-click to edit label"
    >
      {clipPath ? (
        <ClippedShape clipPath={clipPath} visual={visual} borderWidth={borderWidth} />
      ) : shape === 'text' || isFigure ? null : (
        <div
          className="absolute inset-0"
          style={{
            background: visual.background ?? '#ffffff',
            border: `${borderWidth}px ${shape === 'external' ? 'dashed' : 'solid'} ${visual.borderColor ?? '#334155'}`,
            borderRadius: borderRadiusFor(shape),
          }}
        />
      )}

      {/* Shape-specific decorations */}
      {shape === 'database' && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[24%] rounded-[50%]"
          style={{ border: `${borderWidth}px solid ${visual.borderColor ?? '#334155'}` }}
        />
      )}
      {shape === 'queue' && (
        <div
          className="pointer-events-none absolute inset-x-3 top-1/3 space-y-0 border-t border-b py-2"
          style={{ borderColor: visual.borderColor ?? '#334155' }}
        />
      )}

      {/* Content */}
      <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
        {shape === 'user' && <PersonGlyph color={color} />}
        {shape === 'actor' && <ActorGlyph color={color} />}
        {labelBlock}
        {shape === 'entity' && data.attributes && data.attributes.length > 0 && (
          <div
            className="mt-1 w-full border-t px-2 pt-1"
            style={{ borderColor: visual.borderColor }}
          >
            {data.attributes.map((attr) => (
              <div
                key={attr}
                className="truncate font-mono text-[11px] leading-relaxed"
                style={{ color }}
              >
                {attr}
              </div>
            ))}
          </div>
        )}
        {shape === 'class' && (
          <>
            {data.attributes && data.attributes.length > 0 && (
              <div
                className="mt-1 w-full border-t px-2 pt-1"
                style={{ borderColor: visual.borderColor }}
              >
                {data.attributes.map((attr) => (
                  <div
                    key={attr}
                    className="truncate font-mono text-[11px] leading-relaxed"
                    style={{ color }}
                  >
                    {attr}
                  </div>
                ))}
              </div>
            )}
            {data.methods && data.methods.length > 0 && (
              <div
                className="w-full border-t px-2 pt-1"
                style={{ borderColor: visual.borderColor }}
              >
                {data.methods.map((m) => (
                  <div
                    key={m}
                    className="truncate font-mono text-[11px] leading-relaxed"
                    style={{ color }}
                  >
                    {m}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {data.subtitle && (
          <div className="mt-0.5 px-2 text-[11px] text-slate-500">{data.subtitle}</div>
        )}
      </div>

      {HANDLE_POSITIONS.map((h) => (
        <Handle
          key={h.id}
          id={h.id}
          type="source"
          position={h.position}
          style={{
            ...h.style,
            width: 9,
            height: 9,
            background: '#ffffff',
            border: '1.5px solid #64748b',
          }}
        />
      ))}
    </div>
  );
}
