# Flowora — API Specification

| Field        | Value                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------ |
| Version      | 1.0                                                                                        |
| Date         | 2026-11-14                                                                                 |
| Status       | Accepted                                                                                   |
| Source       | Flowora PRD v1.0 (14 Nov 2026); [HLD](HLD.md); [DATABASE](DATABASE.md)                     |
| Related docs | [openapi.yaml](openapi.yaml) (machine-readable form of this spec) · [README](../README.md) |

## 1. Scope and MVP Status

This document specifies the Flowora REST API (`apps/api`, NestJS + TypeORM, PostgreSQL).

**MVP status:** the MVP web app is local-first and makes **no backend calls**. The MVP API ships
only the **health endpoint** and the **diagrams CRUD module backed by an in-memory repository**.
All other endpoints in this spec (folders, templates, share, versions, server-side export) are
**Phase 2** and are specified now so the client, the database schema, and the API evolve against
one contract. Phase 2 endpoints are marked as such throughout.

## 2. Conventions

- **Base URL:** `/api/v1` (versioned path prefix; a future breaking change becomes `/api/v2`).
- **Content type:** `application/json` for requests and responses unless noted (export downloads
  return `image/png`, `image/svg+xml`, or `application/pdf`).
- **IDs:** UUID v4 strings.
- **Timestamps:** ISO 8601 UTC strings (e.g. `2026-11-14T08:30:00.000Z`).
- **Pagination:** `?page=` (1-based, default 1) and `?pageSize=` (default 20, max 100). List
  responses include a `meta` object: `{ page, pageSize, total, totalPages }`.
- **Diagrams are whole documents:** create/update send the full Flowora JSON v1 document in
  `content`. There are no per-node or per-edge endpoints in MVP or Phase 2 — the JSONB document
  is the unit of read/write (see [DATABASE.md §2](DATABASE.md)).
- **Optimistic locking:** updates accept an optional `If-Match: <version>` header (the integer
  `version` from the last read). If the stored version differs, the server returns `409
VERSION_CONFLICT`. Without the header, last-write-wins applies.

## 3. Authentication (Phase 2)

The MVP has no authentication (no accounts, no backend calls). Phase 2 adds JWT:

- `POST /api/v1/auth/register` — `{ email, password, displayName? }` → `201` with user + tokens.
  (Specified here for completeness; auth endpoints are out of scope for the MVP openapi.yaml.)
- `POST /api/v1/auth/login` — `{ email, password }` → `200` with tokens.
- **Access token:** short-lived JWT (15 min), sent as `Authorization: Bearer <token>`.
- **Refresh token:** long-lived (7 days), rotated on use, sent as `POST /api/v1/auth/refresh`
  with `{ refreshToken }`.
- **Passwords:** bcrypt-hashed server-side; never returned in any response.
- **Authorization:** the diagram owner has full access. Shared users are governed by
  `share_permissions`: `viewer` (read) or `editor` (read + write). Every diagram endpoint checks
  ownership or a share row; unauthorized access returns `403 FORBIDDEN` (or `404 NOT_FOUND` when
  the diagram must not be revealed to exist — list/detail endpoints return 404 for diagrams the
  caller cannot see).
- **MVP note:** until auth lands, Phase 2 endpoints are not callable by the shipped web app.

## 4. Endpoints

### 4.1 Health — MVP

| Method | Path             | Description              |
| ------ | ---------------- | ------------------------ |
| `GET`  | `/api/v1/health` | Liveness check. No auth. |

Response `200`:

```json
{ "status": "ok", "version": "1.0.0", "uptimeSeconds": 1234 }
```

### 4.2 Diagrams — MVP (in-memory repo) / Phase 2 (Postgres)

| Method   | Path                              | Description                                                                                         |
| -------- | --------------------------------- | --------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/v1/diagrams`                | List my diagrams (owner + shared-with-me). Supports `?type=`, `?folderId=`, `?search=`, pagination. |
| `POST`   | `/api/v1/diagrams`                | Create a diagram.                                                                                   |
| `GET`    | `/api/v1/diagrams/{id}`           | Get one diagram (full document).                                                                    |
| `PUT`    | `/api/v1/diagrams/{id}`           | Replace a diagram's document (full replace).                                                        |
| `PATCH`  | `/api/v1/diagrams/{id}`           | Update metadata only (`name`, `folderId`).                                                          |
| `DELETE` | `/api/v1/diagrams/{id}`           | Delete a diagram (owner only).                                                                      |
| `POST`   | `/api/v1/diagrams/{id}/duplicate` | Duplicate a diagram (new id, `"Copy of <name>"`).                                                   |

**Create request** (`POST /api/v1/diagrams`) — `201`:

```json
{
  "name": "Payment Architecture",
  "type": "HLD",
  "folderId": null,
  "templateId": null,
  "content": {
    "id": "…",
    "name": "Payment Architecture",
    "type": "HLD",
    "schemaVersion": 1,
    "version": 1,
    "viewport": { "zoom": 1, "x": 0, "y": 0 },
    "nodes": [],
    "edges": [],
    "metadata": { "createdAt": "…", "updatedAt": "…" }
  }
}
```

- `content` is optional: if omitted (or `templateId` is given), the server builds the document
  from the template or from an empty document of the given `type`.
- If `content` is provided, `name` and `type` must match `content.name` / `content.type`.

**Diagram response** (single + list item — list items omit `content`):

```json
{
  "id": "…",
  "ownerId": "…",
  "folderId": null,
  "templateId": null,
  "name": "Payment Architecture",
  "type": "HLD",
  "schemaVersion": 1,
  "version": 3,
  "content": { "…full Flowora JSON v1 document…" },
  "createdAt": "2026-11-14T08:30:00.000Z",
  "updatedAt": "2026-11-14T09:12:00.000Z"
}
```

**Update** (`PUT /api/v1/diagrams/{id}`) — `200`: same body shape as create; `content` is
required. Increments `version`, updates `updatedAt`, and (Phase 2) writes a `diagram_versions`
snapshot and rebuilds the node/edge projections.

**Duplicate** (`POST /api/v1/diagrams/{id}/duplicate`) — `201`: returns the new diagram.

### 4.3 Folders — Phase 2

| Method   | Path                   | Description                                                                                             |
| -------- | ---------------------- | ------------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/v1/folders`      | List my folders (flat list; clients build the tree from `parentId`).                                    |
| `POST`   | `/api/v1/folders`      | Create a folder. `{ name, parentId? }` → `201`.                                                         |
| `GET`    | `/api/v1/folders/{id}` | Get one folder.                                                                                         |
| `PATCH`  | `/api/v1/folders/{id}` | Rename / reparent. `{ name?, parentId? }` → `200`.                                                      |
| `DELETE` | `/api/v1/folders/{id}` | Delete a folder. Diagrams inside move to root (`folderId = null`); child folders are deleted (cascade). |

Folder response:

```json
{
  "id": "…",
  "ownerId": "…",
  "parentId": null,
  "name": "System Design",
  "createdAt": "…",
  "updatedAt": "…"
}
```

Validation: `name` is required, 1–100 chars. `parentId` must reference a folder owned by the
caller and must not create a cycle (a folder cannot become its own ancestor) — `400
VALIDATION_ERROR` otherwise.

### 4.4 Templates — Phase 2

| Method | Path                     | Description                                                            |
| ------ | ------------------------ | ---------------------------------------------------------------------- |
| `GET`  | `/api/v1/templates`      | List templates. `?type=` filter, `?builtin=true` for seeded templates. |
| `GET`  | `/api/v1/templates/{id}` | Get one template (includes `content`).                                 |

Template response:

```json
{
  "id": "…",
  "name": "HLD Payment Architecture",
  "type": "HLD",
  "description": "Payment service architecture with gateway, services, and datastores.",
  "content": { "…Flowora JSON v1 document…" },
  "isBuiltin": true,
  "createdAt": "…",
  "updatedAt": "…"
}
```

List items include `content` (templates are small and the client needs the document to instantiate
them). Template creation by users is a later Phase 2 addition and is not specified here.

### 4.5 Sharing — Phase 2

| Method   | Path                                   | Description                                                                       |
| -------- | -------------------------------------- | --------------------------------------------------------------------------------- |
| `POST`   | `/api/v1/diagrams/{id}/share`          | Grant access. `{ userId, permission: "viewer" \| "editor" }` → `201`. Owner only. |
| `GET`    | `/api/v1/diagrams/{id}/share`          | List shares for a diagram. Owner + editors.                                       |
| `DELETE` | `/api/v1/diagrams/{id}/share/{userId}` | Revoke access. Owner only. → `204`.                                               |

Share response:

```json
{
  "id": "…",
  "diagramId": "…",
  "grantedTo": "…",
  "grantedBy": "…",
  "permission": "editor",
  "createdAt": "…"
}
```

Granting to a user who already has a share updates the permission (upsert, returns `200`).
Granting to the owner is a `400 VALIDATION_ERROR`. Real-time collaboration (P2/P3) is out of
scope; sharing is async access control only.

### 4.6 Versions — Phase 2

| Method | Path                                               | Description                                                                                                       |
| ------ | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/v1/diagrams/{id}/versions`                   | List versions (newest first, paginated).                                                                          |
| `GET`  | `/api/v1/diagrams/{id}/versions/{version}`         | Get one version snapshot (includes `content`).                                                                    |
| `POST` | `/api/v1/diagrams/{id}/versions/{version}/restore` | Restore a version: sets the diagram's content to the snapshot, bumps `version`. → `200` with the updated diagram. |

Version response:

```json
{
  "id": "…",
  "diagramId": "…",
  "version": 2,
  "content": { "…snapshot…" },
  "createdBy": "…",
  "createdAt": "…"
}
```

List items omit `content`. Retention: last 50 versions per diagram (older rows pruned on save).

### 4.7 Server-Side Export Job — Phase 2

Client-side export covers the MVP. A server-side job exists for Phase 2 (large diagrams, headless
rendering, shared-link exports).

| Method | Path                           | Description                                                                                                                                                                              |
| ------ | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/api/v1/diagrams/{id}/export` | Start an export job. `{ format: "png" \| "svg" \| "pdf", scale?: 1 \| 2, pageSize?: "A4" \| "A3", orientation?: "portrait" \| "landscape" }` → `202` with `{ jobId, status: "queued" }`. |
| `GET`  | `/api/v1/exports/{jobId}`      | Poll job status. `200` with `{ jobId, status: "queued" \| "processing" \| "done" \| "failed", downloadUrl?, error? }`.                                                                   |

`downloadUrl` is a short-lived signed URL. Jobs expire after 1 hour. This endpoint is specified
for Phase 2 only and is not implemented in MVP.

## 5. Validation Rules

| Field                                  | Rule                                                                                                                                                                   |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Diagram `name`                         | Required, 1–200 chars.                                                                                                                                                 |
| Diagram `type`                         | Required, one of `HLD`, `LLD`, `ERD`, `FLOWCHART`, `UML`, `SEQUENCE`, `NETWORK`, `CLOUD`, `DFD`, `BPMN`, `OTHER`.                                                      |
| Diagram `content`                      | Required on `PUT`; optional on `POST`. Must pass the `@flowora/shared` zod schema for its `schemaVersion`. Unknown `schemaVersion` → `400 UNSUPPORTED_SCHEMA_VERSION`. |
| `content.id`                           | Must equal the path `{id}` on `PUT` (or the server-assigned id on `POST` when the client supplies one).                                                                |
| `folderId` / `templateId` / `parentId` | Must reference an existing, caller-owned (or public, for built-in templates) row.                                                                                      |
| `permission`                           | `viewer` or `editor` only.                                                                                                                                             |
| Pagination                             | `page >= 1`; `1 <= pageSize <= 100`. Out-of-range values are clamped, not rejected.                                                                                    |
| Request body size                      | Max 10 MB (a 1000+-element document is far below this). Larger → `413 PAYLOAD_TOO_LARGE`.                                                                              |

Validation failures return `400` with the error envelope (§6) and a `details` array naming each
bad field (zod issue format: `{ path, message }`).

## 6. Error Envelope and Error Codes

All errors use the same envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description.",
    "details": [{ "path": "content.nodes[0].id", "message": "Required" }]
  }
}
```

`details` is present only for validation errors.

| HTTP | Code                         | Meaning                                                                         |
| ---- | ---------------------------- | ------------------------------------------------------------------------------- |
| 400  | `VALIDATION_ERROR`           | Request body/params failed validation (see `details`).                          |
| 400  | `UNSUPPORTED_SCHEMA_VERSION` | `content.schemaVersion` is not supported by this API version.                   |
| 401  | `UNAUTHORIZED`               | Missing, expired, or invalid access token (Phase 2).                            |
| 403  | `FORBIDDEN`                  | Authenticated but not allowed (not owner, no share, viewer attempting a write). |
| 404  | `NOT_FOUND`                  | Resource does not exist (or is not visible to the caller).                      |
| 409  | `VERSION_CONFLICT`           | `If-Match` version does not match the stored version.                           |
| 409  | `ALREADY_EXISTS`             | Duplicate create (e.g. folder name collision where uniqueness is enforced).     |
| 413  | `PAYLOAD_TOO_LARGE`          | Request body exceeds 10 MB.                                                     |
| 429  | `RATE_LIMITED`               | Rate limit exceeded (see §7); `Retry-After` header is set.                      |
| 500  | `INTERNAL_ERROR`             | Unexpected server error. No internals leak in `message`.                        |

## 7. Rate Limits (Phase 2)

| Scope                                       | Limit                        |
| ------------------------------------------- | ---------------------------- |
| Authenticated user                          | 600 requests / minute.       |
| Unauthenticated (`/health`, auth endpoints) | 60 requests / minute per IP. |
| Export jobs                                 | 10 jobs / hour per user.     |

Responses carry `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`
(unix seconds). Exceeding a limit returns `429 RATE_LIMITED` with a `Retry-After` header.

## 8. Versioning

- The API is versioned by URL path: `/api/v1/...`.
- Additive changes (new endpoints, new optional fields) do not bump the version.
- Breaking changes (removed/renamed fields, changed semantics) ship as `/api/v2`, with v1
  supported for at least 6 months after v2's release.
- The Flowora **document** schema version (`schemaVersion` inside `content`) is independent of
  the API version and evolves via `migrate()` in `@flowora/shared`.
