import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DiagramEntity } from './diagram.entity';

/**
 * Normalized projection of a diagram edge (Phase 2: search/analytics).
 * The authoritative edge lives inside DiagramEntity.content (JSONB).
 */
@Entity({ name: 'edges' })
@Index(['diagramId', 'sourceNodeId'])
@Index(['diagramId', 'targetNodeId'])
export class EdgeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Client-side edge id from the Flowora JSON document. */
  @Column({ type: 'varchar', length: 100 })
  edgeId!: string;

  @Column({ type: 'uuid' })
  diagramId!: string;

  @ManyToOne(() => DiagramEntity, (diagram) => diagram.edges, { onDelete: 'CASCADE' })
  diagram!: DiagramEntity;

  @Column({ type: 'varchar', length: 100 })
  sourceNodeId!: string;

  @Column({ type: 'varchar', length: 100 })
  targetNodeId!: string;

  @Column({ type: 'varchar', length: 20, default: 'bezier' })
  type!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  label!: string | null;
}
