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
import { User } from './user.entity';
import { DiagramEntity } from './diagram.entity';

@Entity({ name: 'folders' })
@Index(['ownerId', 'name'])
export class Folder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'uuid' })
  ownerId!: string;

  @ManyToOne(() => User, (user) => user.folders, { onDelete: 'CASCADE' })
  owner!: User;

  /** Self-reference for nested folders; null = top level. */
  @Column({ type: 'uuid', nullable: true })
  parentId!: string | null;

  @ManyToOne(() => Folder, (folder) => folder.children, { onDelete: 'CASCADE', nullable: true })
  parent!: Folder | null;

  @OneToMany(() => Folder, (folder) => folder.parent)
  children!: Folder[];

  @OneToMany(() => DiagramEntity, (diagram) => diagram.folder)
  diagrams!: DiagramEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
