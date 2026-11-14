import { z } from 'zod';

/**
 * Flowora JSON document format, version 1.
 *
 * This is the single source of truth for the editable diagram format, shared
 * by apps/web (IndexedDB + .flowora.json import/export) and apps/api
 * (validation of diagram content stored as JSONB). See docs/DATABASE.md.
 */

export const SCHEMA_VERSION = 1 as const;

export const diagramTypes = [
  'blank',
  'HLD',
  'LLD',
  'ERD',
  'flowchart',
  'UML',
  'DFD',
  'network',
  'cloud',
  'BPMN',
] as const;
export const DiagramTypeSchema = z.enum(diagramTypes);
export type DiagramType = z.infer<typeof DiagramTypeSchema>;

export const nodeShapeTypes = [
  // Basic
  'rectangle',
  'rounded',
  'ellipse',
  'diamond',
  'text',
  // Flowchart
  'terminator',
  'process',
  'decision',
  'io',
  'document',
  // ERD
  'entity',
  'attribute',
  'relationship',
  // HLD / Cloud
  'service',
  'api',
  'database',
  'queue',
  'user',
  'external',
  // UML
  'class',
  'actor',
  'usecase',
] as const;
export const NodeShapeTypeSchema = z.enum(nodeShapeTypes);
export type NodeShapeType = z.infer<typeof NodeShapeTypeSchema>;

export const edgeTypes = ['straight', 'smoothstep', 'bezier'] as const;
export const EdgeTypeSchema = z.enum(edgeTypes);
export type FloworaEdgeType = z.infer<typeof EdgeTypeSchema>;

export const textAlignments = ['left', 'center', 'right'] as const;
export const TextAlignSchema = z.enum(textAlignments);
export type TextAlign = z.infer<typeof TextAlignSchema>;

export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type Position = z.infer<typeof PositionSchema>;

export const SizeSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
});
export type Size = z.infer<typeof SizeSchema>;

/** Visual style of a node. All fields optional — defaults live in apps/web. */
export const NodeStyleSchema = z.object({
  background: z.string().optional(),
  borderColor: z.string().optional(),
  borderWidth: z.number().min(0).max(12).optional(),
  color: z.string().optional(),
  fontSize: z.number().min(8).max(72).optional(),
  textAlign: TextAlignSchema.optional(),
});
export type NodeStyle = z.infer<typeof NodeStyleSchema>;

export const NodeDataSchema = z.object({
  label: z.string(),
  /** ERD: attribute lines, e.g. ["id: int PK", "name: string"]. */
  attributes: z.array(z.string()).optional(),
  /** UML class: method lines, e.g. ["+ create(order)", "+ get(id)"]. */
  methods: z.array(z.string()).optional(),
  /** ERD relationship / edge cardinality, e.g. "1:N". */
  cardinality: z.string().optional(),
  subtitle: z.string().optional(),
});
export type NodeData = z.infer<typeof NodeDataSchema>;

export const FloworaNodeSchema = z.object({
  id: z.string().min(1),
  type: NodeShapeTypeSchema,
  position: PositionSchema,
  data: NodeDataSchema,
  style: NodeStyleSchema.optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  /** Group id this node belongs to (Phase 1 grouping; reserved in v1). */
  groupId: z.string().optional(),
  selected: z.boolean().optional(),
});
export type FloworaNode = z.infer<typeof FloworaNodeSchema>;

export const FloworaEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
  type: EdgeTypeSchema.default('bezier'),
  label: z.string().optional(),
  animated: z.boolean().optional(),
  arrowHead: z.boolean().optional(),
  color: z.string().optional(),
});
export type FloworaEdge = z.infer<typeof FloworaEdgeSchema>;

export const ViewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number().positive(),
});
export type Viewport = z.infer<typeof ViewportSchema>;

export const DiagramMetadataSchema = z.object({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type DiagramMetadata = z.infer<typeof DiagramMetadataSchema>;

export const DiagramSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  type: DiagramTypeSchema,
  /** Format version of this document. Always 1 in the MVP. */
  version: z.literal(1),
  viewport: ViewportSchema,
  nodes: z.array(FloworaNodeSchema),
  edges: z.array(FloworaEdgeSchema),
  metadata: DiagramMetadataSchema,
  /** Canvas settings persisted with the diagram. */
  canvas: z
    .object({
      background: z.string().optional(),
      showGrid: z.boolean().optional(),
      snapToGrid: z.boolean().optional(),
    })
    .optional(),
});
export type Diagram = z.infer<typeof DiagramSchema>;

/** A saved diagram file: the document plus its format marker. */
export const FloworaFileSchema = z.object({
  format: z.literal('flowora'),
  schemaVersion: z.literal(1),
  diagram: DiagramSchema,
});
export type FloworaFile = z.infer<typeof FloworaFileSchema>;

/** Parse + validate an unknown value as a Flowora diagram document. */
export function parseDiagram(value: unknown): Diagram {
  return DiagramSchema.parse(value);
}

/** Safe-parse variant returning a human-readable error instead of throwing. */
export function safeParseDiagram(
  value: unknown,
): { ok: true; diagram: Diagram } | { ok: false; error: string } {
  const result = DiagramSchema.safeParse(value);
  if (result.success) return { ok: true, diagram: result.data };
  const first = result.error.issues[0];
  const path = first ? first.path.join('.') : '';
  return {
    ok: false,
    error: first ? `${path ? `${path}: ` : ''}${first.message}` : 'Invalid diagram file',
  };
}

/** Safe-parse a .flowora.json file (accepts a bare diagram document too). */
export function safeParseFloworaFile(
  value: unknown,
): { ok: true; diagram: Diagram } | { ok: false; error: string } {
  const wrapped = FloworaFileSchema.safeParse(value);
  if (wrapped.success) return { ok: true, diagram: wrapped.data.diagram };
  return safeParseDiagram(value);
}

/**
 * Migrate a stored document to the current schema version.
 * v1 is the first version, so this is a validation pass-through; future
 * versions add stepwise migrations here (v1 -> v2 -> ...).
 */
export function migrateDiagram(value: unknown): Diagram {
  return parseDiagram(value);
}

/** Create a fresh blank diagram document. */
export function createBlankDiagram(id: string, name: string, type: DiagramType): Diagram {
  const now = new Date().toISOString();
  return {
    id,
    name,
    type,
    version: 1,
    viewport: { x: 0, y: 0, zoom: 1 },
    nodes: [],
    edges: [],
    metadata: { createdAt: now, updatedAt: now },
    canvas: { background: '#ffffff', showGrid: true, snapToGrid: true },
  };
}
