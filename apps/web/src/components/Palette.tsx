import { useState, type CSSProperties } from 'react';
import type { NodeShapeType } from '@flowora/shared';
import { SHAPE_CATEGORIES, shapesForCategory, type ShapeDefinition } from '../lib/shapes';

export const DRAG_MIME = 'application/flowora-shape';

function ShapePreview({ shape }: { shape: ShapeDefinition }) {
  const { type } = shape;
  const style: CSSProperties = {
    width: 44,
    height: 26,
    background: shape.defaultStyle.background,
    border: `1.5px solid ${shape.defaultStyle.borderColor}`,
  };
  if (type === 'ellipse' || type === 'attribute' || type === 'usecase' || type === 'terminator') {
    style.borderRadius = '9999px';
  } else if (type === 'rounded' || type === 'api') {
    style.borderRadius = '7px';
  } else if (type === 'diamond' || type === 'decision' || type === 'relationship') {
    style.width = 26;
    style.height = 26;
    style.transform = 'rotate(45deg)';
  } else if (type === 'database') {
    style.borderRadius = '50% / 22%';
  } else if (type === 'text') {
    return <span className="text-sm font-medium text-slate-700">Aa</span>;
  } else if (type === 'user' || type === 'actor') {
    return (
      <svg width="20" height="26" viewBox="0 0 30 40" fill="none" aria-hidden="true">
        <circle cx="15" cy="6" r="4.5" stroke="#475569" strokeWidth="2" />
        <path
          d="M5 36 C5 24 10 18 15 18 C20 18 25 24 25 36"
          stroke="#475569"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return <div style={style} />;
}

export default function Palette({
  onAddAtCenter,
}: {
  onAddAtCenter: (shape: NodeShapeType) => void;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({
    Basic: true,
    Flowchart: true,
    ERD: false,
    'HLD / Cloud': true,
    UML: false,
  });

  return (
    <aside className="flex w-56 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Shapes</h2>
        <p className="mt-0.5 text-[11px] leading-snug text-slate-400">
          Drag onto the canvas, or click to add at the centre.
        </p>
      </div>
      {SHAPE_CATEGORIES.map((category) => (
        <div key={category} className="border-b border-slate-100">
          <button
            type="button"
            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => setOpen((o) => ({ ...o, [category]: !o[category] }))}
            aria-expanded={open[category] ?? false}
          >
            {category}
            <span className="text-slate-400">{open[category] ? '▾' : '▸'}</span>
          </button>
          {open[category] && (
            <div className="grid grid-cols-2 gap-2 px-3 pb-3">
              {shapesForCategory(category).map((shape) => (
                <div
                  key={shape.type}
                  role="button"
                  tabIndex={0}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(DRAG_MIME, shape.type);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => onAddAtCenter(shape.type)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onAddAtCenter(shape.type);
                  }}
                  className="flex cursor-grab flex-col items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1 py-2 hover:border-blue-400 hover:bg-blue-50 active:cursor-grabbing"
                  title={`${shape.label} — ${shape.hint}`}
                >
                  <span className="flex h-7 items-center justify-center">
                    <ShapePreview shape={shape} />
                  </span>
                  <span className="text-center text-[11px] leading-tight text-slate-600">
                    {shape.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </aside>
  );
}
