import type { Diagram } from '@flowora/shared';
import { formatTime } from '../lib/id';

export default function RecoveryBanner({
  draft,
  onRestore,
  onDiscard,
}: {
  draft: Diagram;
  onRestore: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
      <span aria-hidden="true">⚠</span>
      <span className="flex-1">
        We found unsaved work from {formatTime(draft.metadata.updatedAt)} that is newer than the
        last saved version. Restore it, or discard it and keep the saved version.
      </span>
      <button
        type="button"
        onClick={onRestore}
        className="rounded bg-amber-600 px-3 py-1.5 font-medium text-white hover:bg-amber-700"
      >
        Restore draft
      </button>
      <button
        type="button"
        onClick={onDiscard}
        className="rounded border border-amber-400 px-3 py-1.5 text-amber-800 hover:bg-amber-100"
      >
        Discard
      </button>
    </div>
  );
}
