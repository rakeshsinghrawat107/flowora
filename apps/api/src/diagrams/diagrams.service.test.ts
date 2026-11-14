import { describe, expect, it } from 'vitest';
import { DiagramsService } from './diagrams.service';
import { InMemoryDiagramRepository } from './diagrams.repository';

describe('DiagramsService (in-memory repository)', () => {
  const makeService = () => new DiagramsService(new InMemoryDiagramRepository());

  it('creates a blank diagram and lists it', () => {
    const service = makeService();
    const created = service.create({ name: 'My HLD', type: 'HLD' });
    expect(created.name).toBe('My HLD');
    expect(created.nodes).toEqual([]);
    expect(created.version).toBe(1);
    expect(service.list()).toHaveLength(1);
  });

  it('rejects invalid diagram content with a 400', () => {
    const service = makeService();
    expect(() => service.create({ name: 'Bad', type: 'HLD', content: { nope: true } })).toThrow(
      /Invalid diagram content/,
    );
  });

  it('updates name and content, and bumps updatedAt', () => {
    const service = makeService();
    const created = service.create({ name: 'Before', type: 'ERD' });
    const updated = service.update(created.id, { name: 'After' });
    expect(updated.name).toBe('After');
    expect(Date.parse(updated.metadata.updatedAt)).toBeGreaterThanOrEqual(
      Date.parse(created.metadata.updatedAt),
    );
  });

  it('throws on unknown ids and deletes known ones', () => {
    const service = makeService();
    expect(() => service.get('missing')).toThrow(/not found/);
    const created = service.create({ name: 'Temp', type: 'flowchart' });
    service.remove(created.id);
    expect(service.list()).toHaveLength(0);
  });
});
