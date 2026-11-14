# ADR 0001 — Canvas Engine: React Flow (@xyflow/react) over tldraw

| Field    | Value                                                                           |
| -------- | ------------------------------------------------------------------------------- |
| Status   | Accepted                                                                        |
| Date     | 2026-11-14                                                                      |
| Deciders | Flowora engineering                                                             |
| Related  | [HLD](../HLD.md) · [LLD](../LLD.md) · [ADR 0002](0002-local-first-indexeddb.md) |

## Context

Flowora's editor is a structured diagramming canvas: typed shapes (services, databases, ER
entities, flowchart decisions), explicit connectors with arrowheads and labels, and a document
model (Flowora JSON v1) that must round-trip exactly through zod validation, IndexedDB, and
`.flowora.json` files. The canvas engine is the most load-bearing library choice in the MVP: it
determines how nodes and edges are modelled, how selection and change events flow into the Zustand
store, and how export captures the canvas.

Candidates: **React Flow** (`@xyflow/react`, v12) and **tldraw**.

## Decision

Use **React Flow (`@xyflow/react`)** as the canvas engine for `apps/web`.

## Rationale

- **Typed nodes and edges are first-class.** React Flow's model is exactly Flowora's model: an
  array of typed nodes plus an array of typed edges, with handles, connection validation, and
  edge types (straight / smoothstep / bezier). The Flowora JSON v1 document maps onto React Flow
  state with no translation layer.
- **Controlled state fits the architecture.** React Flow is fully controlled: the app owns
  `nodes`/`edges` arrays and receives granular `onNodesChange` / `onEdgesChange` events. That
  plugs directly into the Zustand store (`applyChange` funnel), the undo/redo history, and the
  zod-validated save path.
- **Custom nodes are React components.** Double-click inline label editing, per-node styling,
  and resize handles are straightforward custom-node components — no fork, no canvas-level
  event hacking.
- **MIT licence, mature ecosystem.** Stable v12 API, active maintenance, and a licence
  compatible with a free product.
- **Export-friendly.** React Flow renders to the DOM (SVG edges + HTML nodes), so
  `html-to-image` can capture the canvas for PNG/SVG export without a separate renderer.

## Alternatives Considered

### tldraw — rejected

- **Whiteboard/infinite-canvas model.** tldraw is built for freeform whiteboarding: shapes are
  loosely-typed records in a store optimized for freehand drawing, frames, and collaborative
  cursors — not for structured diagrams with typed nodes and explicit connector semantics.
- **Less typed node/edge control.** Extracting a strict, zod-validated node/edge document from
  tldraw's shape store would require a mapping layer in both directions, with edge cases around
  connector attachment, arrowheads, and labels.
- **Heavier for this use case.** tldraw ships a full editor (toolbar, menus, collaboration
  primitives) that Flowora would have to strip down or work around; React Flow ships the canvas
  and lets Flowora own the surrounding UI.

## Consequences

- The editor's node/edge types, handles, and edge rendering are React Flow concepts; the LLD
  documents them as such.
- Pan/zoom, fit-view, and snap-to-grid come from React Flow's built-in viewport and helpers.
- If real-time collaboration (P2/P3) later needs a CRDT-backed canvas, the decision should be
  revisited — but the document model (Flowora JSON v1) stays engine-independent, so a swap would
  be contained to the `Canvas` component and the store's change funnel.
