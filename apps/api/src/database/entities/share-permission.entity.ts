import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { DiagramEntity } from './diagram.entity';
import { User } from './user.entity';

export type ShareRole = 'viewer' | 'editor';

/** Per-user access grant for a shared diagram (Phase 2). */
@Entity({ name: 'share_permissions' })
@Unique(['diagramId', 'userId'])
@Index(['userId'])
export class SharePermission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  diagramId!: string;

  @ManyToOne(() => DiagramEntity, (diagram) => diagram.sharePermissions, { onDelete: 'CASCADE' })
  diagram!: DiagramEntity;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @Column({ type: 'varchar', length: 10 })
  role!: ShareRole;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
