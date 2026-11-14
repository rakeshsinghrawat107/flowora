import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Diagram } from '@flowora/shared';
import { DiagramEntity } from './diagram.entity';

/** Immutable snapshot of a diagram's content at a point in time (Phase 2). */
@Entity({ name: 'diagram_versions' })
@Index(['diagramId', 'versionNumber'])
export class DiagramVersion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  diagramId!: string;

  @ManyToOne(() => DiagramEntity, (diagram) => diagram.versions, { onDelete: 'CASCADE' })
  diagram!: DiagramEntity;

  @Column({ type: 'int' })
  versionNumber!: number;

  @Column({ type: 'jsonb' })
  content!: Diagram;

  @Column({ type: 'uuid', nullable: true })
  createdById!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
