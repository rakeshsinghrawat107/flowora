const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: 'Ctrl / Cmd + Z', action: 'Undo' },
  { keys: 'Ctrl / Cmd + Shift + Z', action: 'Redo' },
  { keys: 'Ctrl / Cmd + Y', action: 'Redo' },
  { keys: 'Ctrl / Cmd + C', action: 'Copy selection' },
  { keys: 'Ctrl / Cmd + V', action: 'Paste' },
  { keys: 'Ctrl / Cmd + D', action: 'Duplicate selection' },
  { keys: 'Ctrl / Cmd + A', action: 'Select all' },
  { keys: 'Ctrl / Cmd + S', action: 'Save diagram' },
  { keys: 'Delete / Backspace', action: 'Delete selection' },
  { keys: 'F', action: 'Fit diagram to screen' },
  { keys: 'Shift + drag', action: 'Box-select multiple shapes' },
  { keys: 'Double-click shape', action: 'Edit label in place' },
  { keys: '?', action: 'Show this list' },
];

export default function ShortcutsPopover({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="w-full max-w-md rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-800">Keyboard shortcuts</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <ul className="max-h-[60vh] overflow-y-auto px-4 py-3">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-slate-600">{s.action}</span>
              <kbd className="rounded border border-slate-300 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-700">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
