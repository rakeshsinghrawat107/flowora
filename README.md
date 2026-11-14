# Flowora — Think. Draw. Connect.

Flowora is a **free, browser-based diagramming workspace** for students, developers,
architects, and teams. Create HLD, LLD, ERD, flowcharts, UML, sequence, network, cloud, DFD,
and BPMN diagrams with drag-and-drop — no account required.

> **Create any diagram. Edit everything. Export anywhere.**

The MVP is **local-first**: the web app runs fully offline after it loads, saves to your
browser (IndexedDB), and exports PNG, SVG, and PDF without any data leaving your machine.
Cloud sync, sharing, and accounts arrive in Phase 2.

**Source spec:** Flowora PRD v1.0 (14 Nov 2026). The engineering docs in `docs/` implement
PRD §18 (HLD, LLD, database design, API spec).

## Documentation

| Document                               | Contents                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------ |
| [docs/HLD.md](docs/HLD.md)             | System architecture (C4 diagrams), data flows, scalability, reliability, NFR mapping       |
| [docs/LLD.md](docs/LLD.md)             | Component tree, Zustand store, storage layer, export service, sequence diagrams, shortcuts |
| [docs/DATABASE.md](docs/DATABASE.md)   | PostgreSQL schema (Phase 2), ERD, JSONB-vs-normalized decision, migrations                 |
| [docs/API_SPEC.md](docs/API_SPEC.md)   | REST API spec (`/api/v1`): diagrams, folders, templates, share, versions, export           |
| [docs/openapi.yaml](docs/openapi.yaml) | Machine-readable OpenAPI 3.0 form of the API spec                                          |
| [docs/adr/](docs/adr/)                 | Architecture decision records (canvas engine, local-first storage, monorepo)               |

## Architecture Summary

```
Browser (MVP — everything local)              Phase 2 (future)
┌──────────────────────────────────┐          ┌──────────────────────────┐
│ Flowora SPA                      │          │ Flowora API (NestJS)     │
│ React 19 + Vite + React Flow     │  sync    │ TypeORM + PostgreSQL     │
│ Zustand store  ·  zod schemas    │ ─ ─ ─ ▶  │ JSONB diagram documents  │
│ IndexedDB: diagrams + drafts     │          │ share · versions · auth  │
└──────────────────────────────────┘          └──────────────────────────┘
```

- **Web app** (`apps/web`): the whole MVP product — dashboard, canvas editor, properties,
  undo/redo, autosave, crash recovery, client-side export/print.
- **Shared package** (`packages/shared`): the Flowora JSON v1 document schema (zod + types),
  consumed by web and API so both agree on the document shape.
- **API** (`apps/api`): NestJS + TypeORM. MVP ships health + diagrams CRUD on an in-memory
  repository; Postgres wiring and cloud sync are Phase 2.
- **Storage decision:** a diagram is one versioned JSONB document — the source of truth.
  Node/Edge tables are normalized projections reserved for Phase 2 search/analytics, not used
  by the MVP read/write path. Full rationale: [docs/DATABASE.md §2](docs/DATABASE.md).

## Tech Stack

| Layer            | Technology                                                 |
| ---------------- | ---------------------------------------------------------- |
| Monorepo         | npm workspaces (`apps/web`, `apps/api`, `packages/shared`) |
| Web app          | Vite + React 19 + TypeScript (strict) + Tailwind CSS       |
| Canvas           | @xyflow/react (React Flow)                                 |
| State            | Zustand (editor state + undo/redo history, cap 100)        |
| Storage (client) | IndexedDB via `idb` (`diagrams` + `drafts` stores)         |
| Validation       | zod (`@flowora/shared` schemas)                            |
| Export           | html-to-image (PNG/SVG) + jsPDF (PDF) + print CSS          |
| Routing          | React Router (`/`, `/d/:id` shareable diagram URLs)        |
| API (Phase 2)    | NestJS + TypeORM + PostgreSQL                              |
| Testing          | Vitest                                                     |
| Lint / format    | ESLint + Prettier (root config)                            |
| CI               | GitHub Actions (`.github/workflows/ci.yml`)                |

## Quickstart

**Prerequisites:** Node.js 20+ and npm.

```bash
# Install all workspace dependencies
npm install

# Run the web app (Vite dev server)
npm run dev

# Run the API (NestJS dev server; MVP: health + in-memory diagrams CRUD)
npm run dev --workspace=apps/api

# Production build (all workspaces)
npm run build

# Typecheck, lint, test
npm run typecheck
npm run lint
npm run test
```

The web app runs fully offline after load — no backend is required for MVP development.

## Project Structure

```
flowora/
├── apps/
│   ├── web/                  # Vite + React 19 SPA (the MVP product)
│   │   └── src/
│   │       ├── components/   # Palette, Canvas, PropertiesPanel, Toolbar,
│   │       │                 # StatusBar, ExportDialog, RecoveryBanner, ShortcutsPopover
│   │       ├── routes/       # Dashboard, Editor
│   │       ├── store/        # Zustand editor store
│   │       ├── storage/      # DiagramRepository + IndexedDB impl + autosave
│   │       ├── services/     # Export service (PNG/SVG/PDF/print)
│   │       └── templates/    # 4 seeded templates (HLD, LLD, ERD, Flowchart)
│   └── api/                  # NestJS + TypeORM (Phase 2; MVP = health + in-memory CRUD)
│       └── src/
│           ├── health/       # Health endpoint
│           ├── diagrams/     # Diagrams CRUD module
│           └── entities/     # User, Diagram, Folder, Node, Edge, Template,
│                             # DiagramVersion, SharePermission
├── packages/
│   └── shared/               # Flowora JSON v1: zod schemas + types + migrate()
├── docs/                     # HLD, LLD, DATABASE, API_SPEC, openapi.yaml, adr/
└── .github/workflows/ci.yml  # typecheck + lint + test + build on every PR
```

## Features (MVP)

- **Dashboard:** create, rename, duplicate, delete diagrams; template gallery; import
  `.flowora.json`.
- **Canvas:** drag-and-drop shapes from five palette categories (Basic, Flowchart, ERD,
  HLD-Cloud, UML); connectors (straight / smoothstep / bezier) with arrowheads and labels;
  multi-select; align left/center/right; zoom + fit-to-screen; snap-to-grid.
- **Editing:** double-click inline label edit; properties panel for nodes, edges, and canvas;
  undo/redo (history cap 100); copy/paste/duplicate; full keyboard shortcut map (`?`).
- **Saving:** autosave (debounced ~1s) with `Saving…` / `Saved HH:MM` / `Error` status;
  manual save (`Ctrl/Cmd+S`); crash recovery via a separate drafts store with an explicit
  Restore/Discard banner — never a silent overwrite.
- **Export:** PNG (1x/2x, transparent toggle), SVG, PDF (jsPDF, A4/A3, portrait/landscape,
  fit-to-page), print, and editable `.flowora.json` import/export.
- **Templates (seeded):** HLD Payment Architecture, LLD Order service classes, ERD
  Student/Course/Enrollment (PK/FK + cardinality), Flowchart login flow.

## PRD Traceability (MVP)

PRD v1.0 functional requirements mapped to implementation status.

| PRD range     | Area                 | MVP status                                                                                                |
| ------------- | -------------------- | --------------------------------------------------------------------------------------------------------- |
| FR-001–FR-010 | Dashboard / projects | ✅ Done — list, create, rename, duplicate, delete, templates, import                                      |
| FR-011–FR-023 | Canvas / editing     | ✅ Done — drag-drop, selection, inline edit, align, zoom, fit view                                        |
| FR-024–FR-033 | Shapes / connectors  | ✅ Done — 5 palette categories, 3 edge types, arrows, labels                                              |
| FR-034–FR-042 | Properties / styling | ✅ Done — node/edge/canvas properties panel                                                               |
| FR-043–FR-050 | Save / recovery      | ✅ Done — autosave, manual save, drafts + recovery banner                                                 |
| FR-051–FR-060 | Export / print       | ✅ Done — PNG/SVG/PDF, print, `.flowora.json`                                                             |
| FR-061–FR-065 | Collaboration        | 📋 Planned (P2/P3) — share permissions + versions specified for Phase 2; real-time collaboration deferred |

NFR targets (PRD §10): editor load < 3s, interaction < 100ms, save < 1s, export < 5s,
1000+ elements per diagram, 99.9% hosted availability target, current Chrome/Edge/Firefox/
Safari, desktop-first. Mapping of each NFR to the design: [docs/HLD.md §10](docs/HLD.md).

## Roadmap

- **P0 — MVP (this repo):** dashboard, canvas, shapes/connectors, properties, undo/redo,
  save/recovery, export/print, templates. Local-first, no accounts.
- **P1 — Cloud sync:** NestJS API + PostgreSQL, accounts (JWT), sync, folders, version
  history, server-side templates and export jobs.
- **P2 — Sharing:** share permissions (viewer/editor), shared-with-me dashboard.
- **P3 — Collaboration:** real-time multi-user editing (CRDT/OT evaluation), comments,
  presence.

## Contributing

1. Fork the repo and create a feature branch.
2. `npm install`, then `npm run dev` to work on the web app.
3. Keep the shared schema (`packages/shared`) in lockstep: any document-shape change ships
   with its `migrate()` path and tests in the same PR.
4. Run `npm run typecheck && npm run lint && npm run test` before pushing; CI runs the same
   on every PR.
5. Record significant architecture decisions as a new ADR in `docs/adr/` (copy the format of
   the existing records).

## License

MIT — see `LICENSE`.
