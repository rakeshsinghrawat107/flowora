import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DiagramEntity } from './diagram.entity';

/**
 * Normalized projection of a diagram node (Phase 2: search/analytics).
 * The authoritative node lives inside DiagramEntity.content (JSONB).
 */
@Entity({ name: 'nodes' })
@Index(['diagramId', 'type'])
export class NodeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Client-side node id from the Flowora JSON document. */
  @Column({ type: 'varchar', length: 100 })
  nodeId!: string;

  @Column({ type: 'uuid' })
  diagramId!: string;

  @ManyToOne(() => DiagramEntity, (diagram) => diagram.nodes, { onDelete: 'CASCADE' })
  diagram!: DiagramEntity;

  @Column({ type: 'varchar', length: 40 })
  type!: string;

  @Column({ type: 'double precision' })
  x!: number;

  @Column({ type: 'double precision' })
  y!: number;

  @Column({ type: 'jsonb' })
  data!: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  style!: Record<string, unknown> | null;
}
