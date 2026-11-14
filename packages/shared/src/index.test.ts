import { describe, expect, it } from 'vitest';
import {
  createBlankDiagram,
  DiagramSchema,
  migrateDiagram,
  safeParseDiagram,
  safeParseFloworaFile,
  type Diagram,
} from './index';

const sample: Diagram = {
  id: 'diagram-001',
  name: 'Payment Architecture',
  type: 'HLD',
  version: 1,
  viewport: { x: 0, y: 0, zoom: 1 },
  nodes: [
    {
      id: 'node-001',
      type: 'rectangle',
      position: { x: 100, y: 100 },
      data: { label: 'Frontend' },
      style: { background: '#dbeafe', borderColor: '#2563eb', fontSize: 14 },
      width: 180,
      height: 60,
    },
    {
      id: 'node-002',
      type: 'database',
      position: { x: 100, y: 240 },
      data: { label: 'Postgres', attributes: ['id: uuid PK'] },
    },
  ],
  edges: [
    {
      id: 'edge-001',
      source: 'node-001',
      target: 'node-002',
      type: 'bezier',
      label: 'reads/writes',
      arrowHead: true,
    },
  ],
  metadata: {
    createdAt: '2026-11-14T00:00:00.000Z',
    updatedAt: '2026-11-14T00:00:00.000Z',
  },
};

describe('Flowora JSON v1 schema', () => {
  it('round-trips a valid diagram through JSON', () => {
    const json = JSON.stringify(sample);
    const parsed = DiagramSchema.parse(JSON.parse(json) as unknown);
    expect(parsed).toEqual(sample);
  });

  it('rejects a diagram with an unknown node type', () => {
    const bad = {
      ...sample,
      nodes: [{ ...sample.nodes[0], type: 'pentagon' }],
    };
    expect(safeParseDiagram(bad).ok).toBe(false);
  });

  it('rejects a diagram missing required metadata', () => {
    const { metadata: _metadata, ...bad } = sample;
    expect(safeParseDiagram(bad).ok).toBe(false);
  });

  it('returns a human-readable error for invalid input', () => {
    const result = safeParseDiagram({ id: 42 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
  });

  it('parses a wrapped .flowora.json file', () => {
    const result = safeParseFloworaFile({
      format: 'flowora',
      schemaVersion: 1,
      diagram: sample,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.diagram.id).toBe('diagram-001');
  });

  it('accepts a bare diagram document as a file', () => {
    const result = safeParseFloworaFile(sample);
    expect(result.ok).toBe(true);
  });

  it('migrateDiagram passes v1 documents through unchanged', () => {
    expect(migrateDiagram(sample)).toEqual(sample);
  });

  it('createBlankDiagram builds a valid empty diagram', () => {
    const blank = createBlankDiagram('d-1', 'Untitled', 'flowchart');
    expect(DiagramSchema.safeParse(blank).success).toBe(true);
    expect(blank.nodes).toEqual([]);
    expect(blank.edges).toEqual([]);
    expect(blank.version).toBe(1);
  });
});
