import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  createBlankDiagram,
  safeParseDiagram,
  type Diagram,
  type DiagramType,
} from '@flowora/shared';
import { randomUUID } from 'node:crypto';
import { InMemoryDiagramRepository } from './diagrams.repository';
import type { CreateDiagramDto, UpdateDiagramDto } from './dto';

@Injectable()
export class DiagramsService {
  constructor(private readonly repository: InMemoryDiagramRepository) {}

  list(): Diagram[] {
    return this.repository.findAll();
  }

  get(id: string): Diagram {
    const found = this.repository.findById(id);
    if (!found) throw new NotFoundException(`Diagram ${id} not found`);
    return found;
  }

  create(dto: CreateDiagramDto): Diagram {
    if (dto.content !== undefined) {
      const parsed = safeParseDiagram(dto.content);
      if (!parsed.ok) {
        throw new BadRequestException(`Invalid diagram content: ${parsed.error}`);
      }
      if (parsed.diagram.name !== dto.name || parsed.diagram.type !== dto.type) {
        throw new BadRequestException('content.name and content.type must match the request body');
      }
      return this.repository.save(parsed.diagram);
    }
    const diagram = createBlankDiagram(randomUUID(), dto.name, dto.type as DiagramType);
    return this.repository.save(diagram);
  }

  update(id: string, dto: UpdateDiagramDto): Diagram {
    const existing = this.get(id);
    let next: Diagram = { ...existing, metadata: { ...existing.metadata } };
    if (dto.name !== undefined) next = { ...next, name: dto.name };
    if (dto.content !== undefined) {
      const parsed = safeParseDiagram(dto.content);
      if (!parsed.ok) {
        throw new BadRequestException(`Invalid diagram content: ${parsed.error}`);
      }
      if (parsed.diagram.id !== id) {
        throw new BadRequestException('content.id must match the path id');
      }
      next = { ...parsed.diagram, name: dto.name ?? parsed.diagram.name };
    }
    next.metadata.updatedAt = new Date().toISOString();
    return this.repository.save(next);
  }

  remove(id: string): void {
    this.get(id);
    this.repository.delete(id);
  }
}
