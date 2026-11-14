import { Injectable } from '@nestjs/common';
import type { Diagram } from '@flowora/shared';

/**
 * In-memory diagram repository for the MVP.
 * Phase 2 replaces this with a TypeORM repository over PostgreSQL
 * (see src/database/entities/diagram.entity.ts) without changing the
 * service interface.
 */
@Injectable()
export class InMemoryDiagramRepository {
  private readonly store = new Map<string, Diagram>();

  findAll(): Diagram[] {
    return [...this.store.values()].sort(
      (a, b) => Date.parse(b.metadata.updatedAt) - Date.parse(a.metadata.updatedAt),
    );
  }

  findById(id: string): Diagram | undefined {
    return this.store.get(id);
  }

  save(diagram: Diagram): Diagram {
    this.store.set(diagram.id, diagram);
    return diagram;
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }
}
