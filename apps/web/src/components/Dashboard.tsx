import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBlankDiagram, type Diagram } from '@flowora/shared';
import { diagramRepository } from '../lib/db';
import { newId } from '../lib/id';
import { readFloworaFile } from '../lib/fileIO';
import { TEMPLATES, type TemplateDefinition } from '../templates';

type SortKey = 'recent' | 'name' | 'created';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setDiagrams(await diagramRepository.listDiagrams());
  }, []);

  useEffect(() => {
    refresh()
      .catch(() => setDiagrams([]))
      .finally(() => setLoading(false));
  }, [refresh]);

  const createBlank = async () => {
    setBusy(true);
    const diagram = createBlankDiagram(newId('diagram'), 'Untitled diagram', 'blank');
    await diagramRepository.putDiagram(diagram);
    navigate(`/d/${diagram.id}`);
  };

  const createFromTemplate = async (template: TemplateDefinition) => {
    setBusy(true);
    const base = createBlankDiagram(newId('diagram'), template.name, template.type);
    const diagram: Diagram = {
      ...base,
      nodes: structuredClone(template.nodes),
      edges: structuredClone(template.edges),
    };
    await diagramRepository.putDiagram(diagram);
    navigate(`/d/${diagram.id}`);
  };

  const commitRename = async (diagram: Diagram) => {
    const name = renameValue.trim();
    setRenamingId(null);
    if (name.length === 0 || name === diagram.name) return;
    await diagramRepository.putDiagram({
      ...diagram,
      name,
      metadata: { ...diagram.metadata, updatedAt: new Date().toISOString() },
    });
    await refresh();
  };

  const duplicate = async (diagram: Diagram) => {
    const now = new Date().toISOString();
    const copy: Diagram = {
      ...structuredClone(diagram),
      id: newId('diagram'),
      name: `${diagram.name} copy`,
      metadata: { createdAt: now, updatedAt: now },
    };
    await diagramRepository.putDiagram(copy);
    await refresh();
  };

  const remove = async (id: string) => {
    await diagramRepository.deleteDiagram(id);
    setDeletingId(null);
    await refresh();
  };

  const handleImport = async (file: File) => {
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
  };

  const visible = diagrams
    .filter((d) => d.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'created')
        return Date.parse(b.metadata.createdAt) - Date.parse(a.metadata.createdAt);
      return Date.parse(b.metadata.updatedAt) - Date.parse(a.metadata.updatedAt);
    });

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Flowora</h1>
            <p className="text-xs text-slate-500">Think. Draw. Connect.</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Import .flowora.json
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImport(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => void createBlank()}
              disabled={busy}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              + New diagram
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {importError && (
          <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            Import failed: {importError}
          </div>
        )}

        <section>
          <h2 className="text-lg font-semibold text-slate-800">Start from a template</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Templates open as new, fully editable diagrams — the template itself never changes.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => void createFromTemplate(t)}
                disabled={busy}
                className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-blue-400 hover:shadow disabled:opacity-50"
              >
                <span className="inline-block rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {t.type}
                </span>
                <span className="mt-2 block font-medium text-slate-800">{t.name}</span>
                <span className="mt-1 block text-xs leading-snug text-slate-500">
                  {t.description}
                </span>
                <span className="mt-2 block text-xs text-slate-400">
                  {t.nodes.length} shapes · {t.edges.length} connectors
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-800">Your diagrams</h2>
            <div className="ml-auto flex items-center gap-2">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name…"
                aria-label="Search diagrams by name"
                className="rounded border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
              />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                aria-label="Sort diagrams"
                className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              >
                <option value="recent">Recently edited</option>
                <option value="name">Name (A–Z)</option>
                <option value="created">Recently created</option>
              </select>
            </div>
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-slate-500">Loading your diagrams…</p>
          ) : diagrams.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <p className="text-lg font-medium text-slate-700">No diagrams yet</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                Create a blank diagram or start from a template. Everything is stored locally in
                this browser — no account needed.
              </p>
              <button
                type="button"
                onClick={() => void createBlank()}
                disabled={busy}
                className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Create your first diagram
              </button>
            </div>
          ) : visible.length === 0 ? (
            <p className="mt-6 rounded bg-white px-4 py-6 text-center text-sm text-slate-500">
              No diagrams match “{query}”. Try a different search.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((d) => (
                <article
                  key={d.id}
                  className="flex flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start gap-2">
                    {renamingId === d.id ? (
                      <input
                        value={renameValue}
                        autoFocus
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => void commitRename(d)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void commitRename(d);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        aria-label="Diagram name"
                        className="w-full rounded border border-blue-500 px-2 py-1 text-sm font-medium focus:outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate(`/d/${d.id}`)}
                        className="flex-1 truncate text-left font-medium text-slate-800 hover:text-blue-700"
                        title={d.name}
                      >
                        {d.name}
                      </button>
                    )}
                    <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {d.type === 'blank' ? 'Blank' : d.type}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {d.nodes.length} shapes · {d.edges.length} connectors · Edited{' '}
                    {formatDate(d.metadata.updatedAt)}
                  </p>
                  <div className="mt-3 flex gap-1.5 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/d/${d.id}`)}
                      className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingId(d.id);
                        setRenameValue(d.name);
                      }}
                      className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => void duplicate(d)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                    >
                      Duplicate
                    </button>
                    {deletingId === d.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void remove(d.id)}
                          className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                        >
                          Confirm delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(null)}
                          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeletingId(d.id)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        Flowora — free diagramming. Your diagrams live in this browser (IndexedDB); export a
        .flowora.json file to take them anywhere.
      </footer>
    </div>
  );
}
