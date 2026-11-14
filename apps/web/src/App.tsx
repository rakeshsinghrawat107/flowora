/**
 * Temporary scaffold shell. The dashboard and editor land in the next PR
 * (feat/web-app-mvp), which replaces this file. It exists only so the
 * monorepo scaffold PR is independently green (typecheck + lint + test +
 * build) before any product UI is added.
 */
export default function App() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-2 bg-slate-50 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">Flowora</h1>
      <p className="text-sm text-slate-500">Think. Draw. Connect.</p>
      <p className="text-sm text-slate-500">
        Scaffold only — the dashboard and editor land in the next PR.
      </p>
    </div>
  );
}
