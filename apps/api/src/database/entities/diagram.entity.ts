import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Diagram } from '@flowora/shared';
import { User } from './user.entity';
import { Folder } from './folder.entity';
import { NodeEntity } from './node.entity';
import { EdgeEntity } from './edge.entity';
import { DiagramVersion } from './diagram-version.entity';
import { SharePermission } from './share-permission.entity';

/**
 * A diagram's metadata row. The editable document itself lives in `content`
 * as a versioned Flowora JSON v1 blob (JSONB) — the source of truth, identical
 * to the format the web app stores in IndexedDB and exports as .flowora.json.
 * The normalized nodes/edges tables are Phase 2 projections for search and
 * analytics, not part of the MVP read/write path. See docs/DATABASE.md.
 */
@Entity({ name: 'diagrams' })
@Index(['ownerId', 'updatedAt'])
@Index(['folderId'])
export class DiagramEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'varchar', length: 20 })
  type!: string;

  /** Flowora JSON schema version of `content` (1 in the MVP). */
  @Column({ type: 'int', default: 1 })
  schemaVersion!: number;

  @Column({ type: 'jsonb' })
  content!: Diagram;

  @Column({ type: 'uuid' })
  ownerId!: string;

  @ManyToOne(() => User, (user) => user.diagrams, { onDelete: 'CASCADE' })
  owner!: User;

  @Column({ type: 'uuid', nullable: true })
  folderId!: string | null;

  @ManyToOne(() => Folder, (folder) => folder.diagrams, { onDelete: 'SET NULL', nullable: true })
  folder!: Folder | null;

  @OneToMany(() => NodeEntity, (node) => node.diagram)
  nodes!: NodeEntity[];

  @OneToMany(() => EdgeEntity, (edge) => edge.diagram)
  edges!: EdgeEntity[];

  @OneToMany(() => DiagramVersion, (version) => version.diagram)
  versions!: DiagramVersion[];

  @OneToMany(() => SharePermission, (permission) => permission.diagram)
  sharePermissions!: SharePermission[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
