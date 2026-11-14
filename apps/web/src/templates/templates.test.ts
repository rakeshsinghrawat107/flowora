import { describe, expect, it } from 'vitest';
import { createBlankDiagram, DiagramSchema } from '@flowora/shared';
import { TEMPLATES } from './index';

describe('seeded templates', () => {
  it('ships exactly the four MVP templates', () => {
    expect(TEMPLATES.map((t) => t.id)).toEqual([
      'tpl-hld-payment',
      'tpl-lld-order',
      'tpl-erd-university',
      'tpl-flowchart-login',
    ]);
  });

  it.each(TEMPLATES.map((t) => [t.id, t]))(
    'template %s builds a valid Flowora diagram',
    (_id, template) => {
      const diagram = {
        ...createBlankDiagram('test-diagram', template.name, template.type),
        nodes: template.nodes,
        edges: template.edges,
      };
      expect(DiagramSchema.safeParse(diagram).success).toBe(true);
      expect(template.nodes.length).toBeGreaterThan(0);
      expect(template.edges.length).toBeGreaterThan(0);
      // Every edge endpoint must reference a node in the template.
      const nodeIds = new Set(template.nodes.map((n) => n.id));
      for (const edge of template.edges) {
        expect(nodeIds.has(edge.source)).toBe(true);
        expect(nodeIds.has(edge.target)).toBe(true);
      }
    },
  );
});
