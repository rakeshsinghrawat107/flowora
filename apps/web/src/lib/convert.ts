import { MarkerType, type Edge, type Node } from '@xyflow/react';
import type {
  Diagram,
  FloworaEdge,
  FloworaEdgeType,
  FloworaNode,
  NodeShapeType,
  NodeStyle,
} from '@flowora/shared';
import { SHAPE_MAP } from './shapes';

/**
 * Conversion between the Flowora JSON v1 document format (the persisted,
 * zod-validated shape) and the React Flow runtime model used by the editor.
 *
 * React Flow side: a single custom node type `flowora`; the shape lives in
 * `data.shape`, visual style in `data.visual`, size in `node.style`.
 */
export interface FloworaNodeData extends Record<string, unknown> {
  shape: NodeShapeType;
  label: string;
  attributes?: string[];
  methods?: string[];
  subtitle?: string;
  cardinality?: string;
  visual: NodeStyle;
}

export type FloworaRFNode = Node<FloworaNodeData, 'flowora'>;
export type FloworaRFEdge = Edge;

export function floworaNodeToRF(node: FloworaNode): FloworaRFNode {
  const def = SHAPE_MAP[node.type];
  return {
    id: node.id,
    type: 'flowora',
    position: { ...node.position },
    data: {
      shape: node.type,
      label: node.data.label,
      attributes: node.data.attributes ? [...node.data.attributes] : undefined,
      methods: node.data.methods ? [...node.data.methods] : undefined,
      subtitle: node.data.subtitle,
      cardinality: node.data.cardinality,
      visual: { ...def.defaultStyle, ...(node.style ?? {}) },
    },
    style: {
      width: node.width ?? def.defaultWidth,
      height: node.height ?? def.defaultHeight,
    },
    selected: node.selected ?? false,
  };
}

function rfNodeSize(node: FloworaRFNode, shape: NodeShapeType): { width: number; height: number } {
  const def = SHAPE_MAP[shape];
  const styleWidth = node.style?.width;
  const styleHeight = node.style?.height;
  return {
    width:
      typeof styleWidth === 'number'
        ? styleWidth
        : (node.measured?.width ?? node.width ?? def.defaultWidth),
    height:
      typeof styleHeight === 'number'
        ? styleHeight
        : (node.measured?.height ?? node.height ?? def.defaultHeight),
  };
}

export function rfNodeToFlowora(node: FloworaRFNode): FloworaNode {
  const { width, height } = rfNodeSize(node, node.data.shape);
  return {
    id: node.id,
    type: node.data.shape,
    position: { x: node.position.x, y: node.position.y },
    data: {
      label: node.data.label,
      attributes: node.data.attributes,
      methods: node.data.methods,
      subtitle: node.data.subtitle,
      cardinality: node.data.cardinality,
    },
    style: { ...node.data.visual },
    width,
    height,
    selected: node.selected ?? false,
  };
}

export function floworaEdgeToRF(edge: FloworaEdge): FloworaRFEdge {
  const color = edge.color ?? '#334155';
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined,
    type: edge.type,
    label: edge.label,
    animated: edge.animated ?? false,
    markerEnd:
      edge.arrowHead === false
        ? undefined
        : { type: MarkerType.ArrowClosed, color, width: 18, height: 18 },
    style: { stroke: color, strokeWidth: 1.5 },
  };
}

export function rfEdgeToFlowora(edge: FloworaRFEdge): FloworaEdge {
  const type = (edge.type as FloworaEdgeType | undefined) ?? 'bezier';
  const stroke = edge.style?.stroke;
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined,
    type,
    label: typeof edge.label === 'string' ? edge.label : undefined,
    animated: edge.animated ?? false,
    arrowHead: edge.markerEnd !== undefined,
    color: typeof stroke === 'string' ? stroke : undefined,
  };
}

export function floworaToRF(diagram: Diagram): { nodes: FloworaRFNode[]; edges: FloworaRFEdge[] } {
  return {
    nodes: diagram.nodes.map(floworaNodeToRF),
    edges: diagram.edges.map(floworaEdgeToRF),
  };
}
