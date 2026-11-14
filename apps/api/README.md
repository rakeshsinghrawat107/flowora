# Flowora API

Minimal NestJS service for Flowora. **Cloud sync is Phase 2** — the web app is
local-first (IndexedDB) and makes no calls to this API in the MVP.

## What it does today

- `GET /api/v1/health` — liveness check.
- `GET /api/v1/diagrams` — list diagrams (in-memory).
- `POST /api/v1/diagrams` — create a blank diagram, or store a full Flowora JSON
  v1 document (validated with `@flowora/shared` zod schemas).
- `GET /api/v1/diagrams/:id`, `PATCH /api/v1/diagrams/:id`,
  `DELETE /api/v1/diagrams/:id`.
- TypeORM entities for the full Phase 2 model: `User`, `Folder`,
  `DiagramEntity` (JSONB content), `NodeEntity`, `EdgeEntity`, `Template`,
  `DiagramVersion`, `SharePermission`. See `docs/DATABASE.md`.

## Run

```bash
npm run dev --workspace=@flowora/api   # tsx watch, http://localhost:3001/api/v1
npm run build --workspace=@flowora/api
npm run start --workspace=@flowora/api
```

## Phase 2 wiring

Set `DATABASE_URL` (PostgreSQL) and `DatabaseModule` connects TypeORM with the
entities above (`synchronize: false` — schema via migrations). Until then the
API runs fully in-memory and data is lost on restart, by design.
