# ADR 0003 — Monorepo: npm Workspaces over Turborepo / Nx / pnpm

| Field    | Value                                                        |
| -------- | ------------------------------------------------------------ |
| Status   | Accepted                                                     |
| Date     | 2026-11-14                                                   |
| Deciders | Flowora engineering                                          |
| Related  | [HLD](../HLD.md) · [ADR 0002](0002-local-first-indexeddb.md) |

## Context

Flowora has three packages that must evolve together: the web app (`apps/web`), the API
(`apps/api`), and the shared schema package (`packages/shared`) containing the Flowora JSON v1
zod schemas and types consumed by both. The repo layout must let a small team move fast, keep
the shared schema in lockstep with both consumers, and run in CI with minimal setup.

Candidates: **npm workspaces**, Turborepo, Nx, and pnpm workspaces.

## Decision

Use a **monorepo with npm workspaces**:

```
flowora/
├── apps/web/         # Vite + React 19 SPA
├── apps/api/         # NestJS + TypeORM
├── packages/shared/  # Flowora JSON v1 (zod + types)
└── .github/workflows/ci.yml
```

Root scripts: `dev`, `build`, `typecheck`, `lint`, `test`. ESLint + Prettier configured at the
root; Vitest for tests; GitHub Actions CI.

## Rationale

- **Zero extra tooling.** npm workspaces ship with npm itself — no additional binary, daemon,
  or config language to learn, install, or debug. Any contributor with Node 20+ and npm can
  clone and run `npm install && npm run dev`.
- **Team familiarity.** npm is the default toolchain the team already knows; Turborepo/Nx
  introduce pipeline/caching concepts that pay off at a scale Flowora does not yet have.
- **Shared schema stays in lockstep.** `apps/web` and `apps/api` both depend on
  `@flowora/shared` via workspace protocol (`workspace:*`), so a schema change is atomic with
  its consumers in a single PR — the client and server can never disagree about the document
  shape.
- **Easy CI.** One checkout, one `npm ci`, one `npm run build` / `test` / `typecheck` /
  `lint` at the root; GitHub Actions needs no remote cache or task-graph setup.
- **Enough for the MVP.** Three packages, one build order (shared → web/api). npm workspaces
  handle that with plain `package.json` scripts and `npm run --workspaces`.

## Alternatives Considered

### Turborepo — rejected for MVP

Excellent caching and task orchestration, but adds a toolchain dependency and configuration
surface for a three-package repo where builds take seconds. Revisit if package count or build
times grow materially.

### Nx — rejected for MVP

The most powerful option and the heaviest: generators, executors, and a project graph the team
does not need yet. Overkill for the MVP; revisit only if the repo grows into many apps/libs.

### pnpm workspaces — rejected for MVP

Faster installs and stricter dependency isolation, but requires every contributor and CI to
install pnpm (and `corepack` enablement), and its strictness surfaces issues in some transitive
dependencies. npm's ubiquity wins for an MVP built by a small team.

## Consequences

- Cross-package scripts are plain npm scripts; there is no build cache or affected-package
  detection — acceptable at this size, and the first thing to revisit if CI slows down.
- `packages/shared` must stay dependency-light (zod + TypeScript only) so both consumers build
  quickly and no web-only or server-only dependency leaks into the shared package.
- If the repo later grows beyond ~5–8 packages or CI build times become a bottleneck, adopt
  Turborepo on top of the existing npm workspaces layout — the migration is additive, not a
  rewrite.
