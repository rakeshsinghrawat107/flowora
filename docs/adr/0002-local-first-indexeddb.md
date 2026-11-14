# ADR 0002 — Local-First Storage: IndexedDB as the Primary MVP Store

| Field    | Value                                                                                                          |
| -------- | -------------------------------------------------------------------------------------------------------------- |
| Status   | Accepted                                                                                                       |
| Date     | 2026-11-14                                                                                                     |
| Deciders | Flowora engineering                                                                                            |
| Related  | [HLD](../HLD.md) · [LLD](../LLD.md) · [DATABASE](../DATABASE.md) · [ADR 0003](0003-monorepo-npm-workspaces.md) |

## Context

The PRD requires: no mandatory registration, a free product, save/reopen, autosave, and crash
recovery — in an MVP built by a small team with no operations budget. The storage choice must
satisfy those requirements on day one, without a server, while leaving a clean path to Phase 2
cloud sync (PostgreSQL + NestJS API).

Candidates: **IndexedDB (via `idb`)**, `localStorage`, and server-first PostgreSQL from the start.

## Decision

Use **IndexedDB (via the `idb` wrapper) as the primary MVP store**, local-first. Two object
stores in database `flowora` (v1):

- `diagrams` — saved Flowora JSON v1 documents (keyPath `id`, index on
  `metadata.updatedAt`).
- `drafts` — crash-recovery snapshots (keyPath `diagramId`).

All documents are zod-validated before write. Cloud sync via PostgreSQL is Phase 2; the web app
makes no backend calls in MVP.

## Rationale

- **No mandatory registration.** Local-first storage means a user can create, edit, save, and
  export diagrams without an account, a sign-up flow, or a backend — exactly what the PRD asks
  for.
- **Capacity and structure.** IndexedDB handles megabytes of structured JSON comfortably and
  supports indexes (dashboard sort by `updatedAt`); `localStorage` caps at ~5 MB, is
  synchronous (blocks the main thread), and stores strings only.
- **Offline by construction.** Once the SPA is loaded, the editor works with no network at all.
  There is no backend to be down, no latency in the save path (NFR-003: save < 1 s is trivially
  met by a local write).
- **Crash recovery is a second store, not an afterthought.** A separate `drafts` store holds
  debounced snapshots; on reopen, a draft newer than the saved document triggers an explicit
  Restore/Discard banner. Recovery never silently overwrites saved work.
- **Portability without a server.** `.flowora.json` import/export (zod-validated) gives users
  backup, sharing, and migration with zero infrastructure.
- **Format identity with Phase 2.** The IndexedDB document and the future Postgres JSONB
  `diagrams.content` are the same Flowora JSON v1 document, so sync is a copy, not a
  translation (see [DATABASE.md §2](../DATABASE.md)).

## Alternatives Considered

### localStorage — rejected

5 MB synchronous string storage. Too small for 1000+-element diagrams plus drafts, blocks the
main thread on every write, and has no indexing. Fine for settings; wrong for documents.

### Server-first PostgreSQL from day one — rejected for MVP

Requires accounts, auth, hosting, and ops before the editor proves itself — and contradicts the
PRD's no-mandatory-registration requirement. Deferred to Phase 2, where the API, entities, and
schema are already specified ([API_SPEC.md](../API_SPEC.md), [DATABASE.md](../DATABASE.md)).

## Consequences

- Diagrams live on one device / browser profile until Phase 2 sync ships; users who clear site
  data lose local diagrams unless they exported `.flowora.json` — the dashboard should say so.
- The `DiagramRepository` interface abstracts the store, so a cloud-backed implementation can
  replace or wrap the IndexedDB one without touching the editor.
- Quota and private-mode failures must be handled gracefully (see [LLD §7](../LLD.md)):
  editing continues in memory, save errors are visible, and `.flowora.json` export is the
  escape hatch.
